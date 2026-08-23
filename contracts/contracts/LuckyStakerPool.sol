// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LuckyStakerPool
/// @notice No-loss weekly prize pool. Principal is always withdrawable; only the weekly
/// yield is raffled off among depositors who kept a full-week eligible balance.
contract LuckyStakerPool is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardTransient,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant SWEEP_DELAY = 3 days;
    // MVP constants (spec 3.3): K=10 participants per extra winner, $10 minimum prize.
    uint256 public constant MIN_PARTICIPANTS_PER_WINNER = 10;
    uint256 public constant MIN_PRIZE = 10e6;

    IERC20 public poolToken;

    uint256 public balancesTotal;
    mapping(address => uint256) public balances;
    // Eligible for the CURRENT epoch's draw (frozen at epoch rollover, zeroed by any withdraw).
    mapping(address => uint256) public eligibleBalance;
    // Deposited this epoch; rolls into eligibleBalance at the next draw.
    mapping(address => uint256) public pendingBalance;
    address[] public participants;
    mapping(address => bool) public isParticipant;

    struct Epoch {
        uint64 startTime;
        uint64 endTime;
        uint64 drawnAt;
        uint256 eligiblePoolSnapshot;
        uint256 eligibleParticipants;
        uint256 weeklyYield;
        uint256 numWinners;
        bytes32 commitHash;
        bool committed;
        bool drawn;
        address[] winners;
        mapping(address => bool) claimed;
    }

    uint256 public currentEpochId;
    mapping(uint256 => Epoch) private epochs;
    // USDC funded by the keeper bot for the epoch currently in progress; consumed at draw time.
    uint256 public pendingYield;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance, bool forfeitedTicket);
    event YieldFunded(uint256 indexed epochId, uint256 amount);
    event Committed(uint256 indexed epochId, bytes32 commitHash);
    event Drawn(uint256 indexed epochId, address[] winners, uint256 weeklyYield, bytes32 resultHash);
    event Claimed(uint256 indexed epochId, address indexed winner, uint256 amount);
    event Swept(uint256 indexed epochId, address indexed winner, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address token, address admin, address keeper) external initializer {
        __AccessControl_init();
        __Pausable_init();

        poolToken = IERC20(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, keeper);

        currentEpochId = 1;
        epochs[1].startTime = uint64(block.timestamp);
        epochs[1].endTime = uint64(block.timestamp + EPOCH_DURATION);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ---------------------------------------------------------------------
    // Deposit / Withdraw — principal is never locked.
    // ---------------------------------------------------------------------

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "amount=0");
        poolToken.safeTransferFrom(msg.sender, address(this), amount);

        if (!isParticipant[msg.sender]) {
            isParticipant[msg.sender] = true;
            participants.push(msg.sender);
        }

        balances[msg.sender] += amount;
        pendingBalance[msg.sender] += amount;
        balancesTotal += amount;

        emit Deposited(msg.sender, amount, balances[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0 && amount <= balances[msg.sender], "bad amount");

        // Withdrawing at any point mid-epoch forfeits this epoch's ticket entirely,
        // even for a partial withdrawal (spec 3.1).
        bool forfeited = eligibleBalance[msg.sender] > 0;
        eligibleBalance[msg.sender] = 0;

        balances[msg.sender] -= amount;
        pendingBalance[msg.sender] = balances[msg.sender];
        balancesTotal -= amount;

        poolToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, balances[msg.sender], forfeited);
    }

    // ---------------------------------------------------------------------
    // Yield funding — off-chain script computes the live formula (spec 3.4)
    // and transfers that amount in; the contract just holds it for the draw.
    // ---------------------------------------------------------------------

    function fundYield(uint256 amount) external nonReentrant onlyRole(KEEPER_ROLE) {
        require(amount > 0, "amount=0");
        poolToken.safeTransferFrom(msg.sender, address(this), amount);
        pendingYield += amount;
        emit YieldFunded(currentEpochId, amount);
    }

    // ---------------------------------------------------------------------
    // Commit-reveal draw (spec 3.5)
    // ---------------------------------------------------------------------

    function commitRandom(bytes32 commitHash) external onlyRole(KEEPER_ROLE) whenNotPaused {
        Epoch storage e = epochs[currentEpochId];
        require(block.timestamp < e.endTime, "epoch already ended");
        require(!e.committed, "already committed");
        e.commitHash = commitHash;
        e.committed = true;
        emit Committed(currentEpochId, commitHash);
    }

    function revealAndDraw(uint256 secret) external nonReentrant onlyRole(KEEPER_ROLE) whenNotPaused {
        uint256 epochId = currentEpochId;
        Epoch storage e = epochs[epochId];
        require(block.timestamp >= e.endTime, "epoch not ended");
        require(e.committed, "not committed");
        require(!e.drawn, "already drawn");
        require(keccak256(abi.encodePacked(secret)) == e.commitHash, "secret mismatch");

        // blockhash(block.number - 1) was unknowable at commit time (days earlier),
        // so neither the keeper nor anyone else could predict the outcome then.
        bytes32 resultHash = keccak256(abi.encodePacked(secret, blockhash(block.number - 1)));

        uint256 n = participants.length;
        uint256[] memory weights = new uint256[](n);
        uint256 totalWeight;
        uint256 eligibleCount;
        for (uint256 i = 0; i < n; i++) {
            uint256 w = eligibleBalance[participants[i]];
            weights[i] = w;
            totalWeight += w;
            if (w > 0) eligibleCount++;
        }
        e.eligiblePoolSnapshot = totalWeight;
        e.eligibleParticipants = eligibleCount;

        uint256 numWinners;
        uint256 yieldAvailable = pendingYield;
        if (eligibleCount > 0 && yieldAvailable > 0) {
            uint256 byParticipants = eligibleCount / MIN_PARTICIPANTS_PER_WINNER;
            uint256 byPrize = yieldAvailable / MIN_PRIZE;
            numWinners = byParticipants < byPrize ? byParticipants : byPrize;
            if (numWinners == 0) numWinners = 1;

            e.weeklyYield = yieldAvailable;
            pendingYield = 0;

            for (uint256 w = 0; w < numWinners; w++) {
                uint256 point = uint256(keccak256(abi.encodePacked(resultHash, w))) % totalWeight;
                uint256 cum;
                for (uint256 i = 0; i < n; i++) {
                    cum += weights[i];
                    if (point < cum) {
                        e.winners.push(participants[i]);
                        break;
                    }
                }
            }
        }
        e.numWinners = numWinners;
        e.drawn = true;
        e.drawnAt = uint64(block.timestamp);
        emit Drawn(epochId, e.winners, e.weeklyYield, resultHash);

        for (uint256 i = 0; i < n; i++) {
            address p = participants[i];
            eligibleBalance[p] += pendingBalance[p];
            pendingBalance[p] = 0;
        }

        currentEpochId = epochId + 1;
        epochs[currentEpochId].startTime = uint64(block.timestamp);
        epochs[currentEpochId].endTime = uint64(block.timestamp + EPOCH_DURATION);
    }

    // ---------------------------------------------------------------------
    // Prize tiers (spec 3.3b)
    // ---------------------------------------------------------------------

    function prizeForRank(uint256 rank, uint256 numWinners, uint256 weeklyYield) public pure returns (uint256) {
        if (numWinners == 0) return 0;
        if (numWinners == 1) return rank == 0 ? weeklyYield : 0;

        uint256 jackpotBps = numWinners <= 5 ? 5000 : 3300;
        uint256 jackpot = (weeklyYield * jackpotBps) / 10000;
        if (rank == 0) return jackpot;

        return (weeklyYield - jackpot) / (numWinners - 1);
    }

    // ---------------------------------------------------------------------
    // Claim (self-serve, first 3 days) / Sweep (permissionless, after 3 days)
    // ---------------------------------------------------------------------

    function claim(uint256 epochId) external nonReentrant {
        Epoch storage e = epochs[epochId];
        require(e.drawn, "not drawn");
        require(block.timestamp < e.drawnAt + SWEEP_DELAY, "past claim window, use sweep");

        uint256 total = _payoutOwed(e, msg.sender);
        require(total > 0, "nothing to claim");
        e.claimed[msg.sender] = true;

        poolToken.safeTransfer(msg.sender, total);
        emit Claimed(epochId, msg.sender, total);
    }

    function sweep(uint256 epochId) external nonReentrant {
        Epoch storage e = epochs[epochId];
        require(e.drawn, "not drawn");
        require(block.timestamp >= e.drawnAt + SWEEP_DELAY, "sweep not open yet");

        for (uint256 i = 0; i < e.winners.length; i++) {
            address winner = e.winners[i];
            if (e.claimed[winner]) continue;
            uint256 total = _payoutOwed(e, winner);
            if (total == 0) continue;
            e.claimed[winner] = true;
            poolToken.safeTransfer(winner, total);
            emit Swept(epochId, winner, total);
        }
    }

    function _payoutOwed(Epoch storage e, address user) private view returns (uint256) {
        if (e.claimed[user]) return 0;
        uint256 total;
        for (uint256 i = 0; i < e.winners.length; i++) {
            if (e.winners[i] == user) {
                total += prizeForRank(i, e.numWinners, e.weeklyYield);
            }
        }
        return total;
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getEpoch(uint256 epochId)
        external
        view
        returns (
            uint64 startTime,
            uint64 endTime,
            uint64 drawnAt,
            uint256 eligiblePoolSnapshot,
            uint256 eligibleParticipants,
            uint256 weeklyYield,
            uint256 numWinners,
            bool committed,
            bool drawn,
            address[] memory winners
        )
    {
        Epoch storage e = epochs[epochId];
        return (
            e.startTime,
            e.endTime,
            e.drawnAt,
            e.eligiblePoolSnapshot,
            e.eligibleParticipants,
            e.weeklyYield,
            e.numWinners,
            e.committed,
            e.drawn,
            e.winners
        );
    }

    function hasClaimed(uint256 epochId, address user) external view returns (bool) {
        return epochs[epochId].claimed[user];
    }

    function owedTo(uint256 epochId, address user) external view returns (uint256) {
        return _payoutOwed(epochs[epochId], user);
    }

    function participantCount() external view returns (uint256) {
        return participants.length;
    }

    // ---------------------------------------------------------------------
    // Emergency pause — type 2 only: blocks new deposits/draws, never withdrawals.
    // ---------------------------------------------------------------------

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
