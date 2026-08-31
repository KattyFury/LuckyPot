// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Declared for a future real yield source; no implementation wired in yet
/// (spec 1) — Arc doesn't have a trustworthy on-chain yield source to point this at today.
interface IYieldSource {
    function getAPY() external view returns (uint256 bps);
}

/// @title LuckyStakerPool
/// @notice No-loss weekly prize pool (product name: LuckyPot). Principal is always
/// withdrawable; only the weekly yield is raffled off among depositors who kept a
/// full-week eligible balance. Contract name kept as-is across the LuckyPot rebrand
/// (2026-08-24) — this is a display-only rename, nothing on-chain changed for it.
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

    // Referral cut taken from every prize at claim time (spec 3), regardless of tier.
    uint256 public constant REFERRAL_BPS = 500; // 5%

    // Hard bands admin-set APRs must stay inside, plus a per-token cooldown between
    // changes so nobody can vote themselves a better rate right before a draw.
    uint256 public constant APR_BPS_USDC_MIN = 400;
    uint256 public constant APR_BPS_USDC_MAX = 800;
    uint256 public constant APR_BPS_ARC_MIN = 200;
    uint256 public constant APR_BPS_ARC_MAX = 400;
    uint256 public constant APR_UPDATE_COOLDOWN = 7 days;

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
        uint256 weeklyYield; // = weeklyPrizePool (tech-spec naming); field name kept for ABI stability.
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
    // Must cover at least that epoch's weeklyPrizePool — see revealAndDraw.
    uint256 public pendingYield;

    // --- Added in the LuckyPot technical-spec upgrade (2026-08-24, applied via UUPS
    // upgrade on the live proxy, NOT a redeploy) — appended after pendingYield so the
    // existing storage layout is untouched. ---

    // Admin-set benchmark APRs (bps) used until Arc has a real yield source to read from.
    uint256 public aprBpsUSDC;
    uint256 public aprBpsARC;
    uint256 public lastAprUpdateUSDC;
    uint256 public lastAprUpdateARC;
    // The token address treated as "USDC" for currentAprBps()'s branch. Set explicitly
    // (rather than hardcoding Arc's USDC address) so it isn't tied to one chain/deployment.
    address public referenceUSDC;

    // Set once at first use, permanent. No self-referral.
    mapping(address => address) public refBy;
    // Accrued referral cuts, pulled by the referrer via claimReferral().
    mapping(address => uint256) public pendingRef;

    // Internal accounting only — funds stay inside this contract until withdrawn, so
    // `whenPaused` on withdrawReserve actually gates something. `to` is chosen by the
    // multisig at withdrawal time; there is no fixed vault wallet address on-chain.
    uint256 public vaultReserve;
    uint256 public vaultDev;

    // --- Appended in V5: admin-controlled deployment into external yield sources ---
    // New storage must go after every existing variable, never interleaved, or
    // upgrading would read old slots as the wrong type.

    /// @dev 0 = never proposed (or revoked); a timestamp = the moment it BECOMES
    /// usable. Revoking is immediate (sets back to 0) - only newly *adding* a
    /// target carries the delay, so a compromised admin key can't whitelist a
    /// fresh malicious contract and drain into it in the same breath.
    mapping(address => uint256) public targetAllowedAt;
    uint256 public constant TARGET_TIMELOCK = 3 days;

    /// @dev Tracked by measuring this contract's own poolToken balance before/after
    /// each executeExternalCall, not by trusting a caller-supplied number - so it
    /// stays correct whether a call sends money out, pulls money (plus yield) back,
    /// or a partial/unexpected amount moves for any other reason.
    mapping(address => uint256) public externalDeployed;
    uint256 public totalExternalDeployed;
    /// @dev No single target may hold more than half of whatever is currently
    /// deployed externally - money is always split across at least two pools once
    /// a second one is in use. The very first-ever deployment is exempt (there is
    /// no second pool yet to compare against).
    uint256 public constant MAX_SINGLE_TARGET_BPS = 5000;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance, bool forfeitedTicket);
    event YieldFunded(uint256 indexed epochId, uint256 amount);
    event Committed(uint256 indexed epochId, bytes32 commitHash);
    event Drawn(uint256 indexed epochId, address[] winners, uint256 weeklyYield, bytes32 resultHash);
    event Claimed(uint256 indexed epochId, address indexed winner, uint256 amount);
    event Swept(uint256 indexed epochId, address indexed winner, uint256 amount);
    event AprUpdated(bool indexed isUsdc, uint256 newBps);
    event ReferrerSet(address indexed user, address indexed referrer);
    event ReferralPaid(address indexed referrer, uint256 amount);
    event ReferralAccrued(address indexed referrer, uint256 amount);
    event ReferralClaimed(address indexed referrer, uint256 amount);
    event VaultAccrued(uint256 reserveAmount, uint256 devAmount);
    event VaultWithdrawn(bool indexed isReserve, address indexed to, uint256 amount, string reason);
    event AllowedTargetProposed(address indexed target, uint256 allowedAt);
    event AllowedTargetRevoked(address indexed target);
    event ExternalCallExecuted(address indexed target, uint256 approveAmount, bytes data, int256 balanceDelta);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice One clean initializer for a fresh deployment. The original launch
    /// used a second `initializeV2(...)` (`reinitializer(2)`) to add the
    /// technical-spec fields on top of a proxy that already held real deposits and
    /// couldn't take a new initialize() signature — that split-initializer history
    /// ends here: this is a fresh proxy with nothing deployed to it yet, so
    /// everything sets in one call, matching how the contract actually reads today.
    function initialize(
        address token,
        address admin,
        address keeper,
        uint256 aprUSDC,
        uint256 aprARC,
        address usdcAddress
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        poolToken = IERC20(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, keeper);

        require(aprUSDC >= APR_BPS_USDC_MIN && aprUSDC <= APR_BPS_USDC_MAX, "aprUSDC out of band");
        require(aprARC >= APR_BPS_ARC_MIN && aprARC <= APR_BPS_ARC_MAX, "aprARC out of band");
        aprBpsUSDC = aprUSDC;
        aprBpsARC = aprARC;
        referenceUSDC = usdcAddress;

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

    /// @notice Testnet convenience: returns every depositor's full principal to their
    /// own wallet in one call, so clearing the pool for a migration/test doesn't mean
    /// asking each test wallet to withdraw by hand. Same money movement as withdraw()
    /// - each address only ever receives its own balance, never anyone else's or the
    /// admin's - so this can't be used to redirect funds, only to force self-serve
    /// withdrawals to happen early. Requires pausing first, same as withdrawReserve,
    /// so it can't run silently while the pool looks normal. MUST be locked out (see
    /// revokeRole) before this pool holds real depositor funds without their consent
    /// to move on this schedule.
    function forceWithdrawAll() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused nonReentrant {
        uint256 n = participants.length;
        for (uint256 i = 0; i < n; i++) {
            address p = participants[i];
            uint256 amount = balances[p];
            if (amount == 0) continue;

            bool forfeited = eligibleBalance[p] > 0;
            eligibleBalance[p] = 0;
            balances[p] = 0;
            pendingBalance[p] = 0;
            balancesTotal -= amount;

            poolToken.safeTransfer(p, amount);
            emit Withdrawn(p, amount, 0, forfeited);
        }
    }

    // ---------------------------------------------------------------------
    // Referral — set once, permanent. Payout happens as a cut at claim time.
    // ---------------------------------------------------------------------

    function setReferrer(address referrer) external {
        require(refBy[msg.sender] == address(0), "referrer already set");
        require(referrer != address(0), "zero address");
        require(referrer != msg.sender, "no self-referral");
        refBy[msg.sender] = referrer;
        emit ReferrerSet(msg.sender, referrer);
    }

    function claimReferral() external nonReentrant {
        uint256 amount = pendingRef[msg.sender];
        require(amount > 0, "nothing to claim");
        pendingRef[msg.sender] = 0;
        poolToken.safeTransfer(msg.sender, amount);
        emit ReferralClaimed(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Admin-set benchmark yield, bounded + rate-limited (spec 1). Replaced by
    // IYieldSource once Arc has a real, trustworthy on-chain yield source.
    // ---------------------------------------------------------------------

    function setAprBpsUSDC(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps >= APR_BPS_USDC_MIN && bps <= APR_BPS_USDC_MAX, "out of band");
        require(block.timestamp >= lastAprUpdateUSDC + APR_UPDATE_COOLDOWN, "rate limited");
        aprBpsUSDC = bps;
        lastAprUpdateUSDC = block.timestamp;
        emit AprUpdated(true, bps);
    }

    function setAprBpsARC(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps >= APR_BPS_ARC_MIN && bps <= APR_BPS_ARC_MAX, "out of band");
        require(block.timestamp >= lastAprUpdateARC + APR_UPDATE_COOLDOWN, "rate limited");
        aprBpsARC = bps;
        lastAprUpdateARC = block.timestamp;
        emit AprUpdated(false, bps);
    }

    function currentAprBps() public view returns (uint256) {
        return address(poolToken) == referenceUSDC ? aprBpsUSDC : aprBpsARC;
    }

    // ---------------------------------------------------------------------
    // Yield funding — the keeper tops pendingYield up to (at least) the current
    // epoch's weeklyPrizePool target; the contract itself never computes a transfer.
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

    /// @notice Testnet convenience: lets the keeper end the current epoch immediately
    /// instead of waiting out the full epochDuration, so commit->reveal cycles can be
    /// exercised on demand while debugging. Must be called after commitRandom (matches
    /// the normal ordering) and before revealAndDraw. Has no effect on prize fairness —
    /// the keeper still can't predict blockhash(block.number - 1) at reveal time.
    /// MUST be locked out (see revokeRole) before this pool accepts real depositor funds.
    function forceEndEpoch() external onlyRole(KEEPER_ROLE) {
        Epoch storage e = epochs[currentEpochId];
        require(e.committed, "commit first");
        require(!e.drawn, "already drawn");
        e.endTime = uint64(block.timestamp);
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

        // weeklyPrizePool is funded only on the portion that sat a full epoch. The keeper
        // funds pendingYield off-chain toward realYieldEarned = balancesTotal * aprBps /
        // 10000 / 52 (the whole pool, incl. pending/mid-week deposits) — that target isn't
        // needed in the math below, only the actually-funded amount is. Winners are always
        // paid weeklyPrizePool in full; anything funded beyond it is surplus, split 50/50
        // into the two internal vault counters (spec 1).
        uint256 weeklyPrizePool = (totalWeight * currentAprBps()) / 10000 / 52;

        uint256 funded = pendingYield;
        require(funded >= weeklyPrizePool, "yield not funded");
        pendingYield = 0;

        uint256 surplus = funded - weeklyPrizePool;
        if (surplus > 0) {
            uint256 half = surplus / 2;
            vaultReserve += half;
            vaultDev += surplus - half;
            emit VaultAccrued(half, surplus - half);
        }

        uint256 numWinners;
        if (eligibleCount > 0 && weeklyPrizePool > 0) {
            numWinners = Math.sqrt(totalWeight / (1000 * 1e6));
            if (numWinners == 0) numWinners = 1;
        }

        e.weeklyYield = weeklyPrizePool;

        if (numWinners > 0) {
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
        uint64 newStart = e.endTime;
        epochs[currentEpochId].startTime = newStart;
        epochs[currentEpochId].endTime = uint64(_nextMondayUTC(newStart));
    }

    /// @dev Next Monday 00:00 UTC strictly after `timestamp`. Epoch boundaries
    /// anchor to calendar weeks (Monday 00:00 UTC -> the following Monday
    /// 00:00 UTC) by chaining off the PREVIOUS epoch's scheduled endTime here,
    /// not block.timestamp at reveal time — so the schedule never drifts even
    /// if the keeper calls revealAndDraw late. Once an epoch's endTime lands
    /// on a Monday, every epoch after it does too, automatically (this
    /// function just adds 7 days in that steady state). Unix epoch 0
    /// (1970-01-01) was a Thursday, so weekday (Monday=0) = (daysSinceEpoch + 3) % 7.
    function _nextMondayUTC(uint256 timestamp) internal pure returns (uint256) {
        uint256 daysSinceEpoch = timestamp / 1 days;
        uint256 dayStart = daysSinceEpoch * 1 days;
        uint256 weekday = (daysSinceEpoch + 3) % 7;
        uint256 daysToAdd = weekday == 0 ? 7 : 7 - weekday;
        return dayStart + daysToAdd * 1 days;
    }

    // ---------------------------------------------------------------------
    // Prize split — continuous jackpot/50-50 split (spec 2), replacing the old
    // participant-count tier table entirely.
    // ---------------------------------------------------------------------

    function prizeForRank(uint256 rank, uint256 numWinners, uint256 weeklyPrizePool) public pure returns (uint256) {
        if (numWinners == 0) return 0;
        if (numWinners == 1) return rank == 0 ? weeklyPrizePool : 0;

        uint256 jackpot = weeklyPrizePool / 2;
        if (rank == 0) return jackpot;

        return (weeklyPrizePool - jackpot) / (numWinners - 1);
    }

    // ---------------------------------------------------------------------
    // Claim (self-serve, first 3 days) / Sweep (permissionless, after 3 days)
    // Both settle through _settle so the referral cut applies identically.
    // ---------------------------------------------------------------------

    function claim(uint256 epochId) external nonReentrant {
        Epoch storage e = epochs[epochId];
        require(e.drawn, "not drawn");
        require(block.timestamp < e.drawnAt + SWEEP_DELAY, "past claim window, use sweep");

        uint256 gross = _payoutOwed(e, msg.sender);
        require(gross > 0, "nothing to claim");
        e.claimed[msg.sender] = true;

        uint256 net = _settle(msg.sender, gross);
        emit Claimed(epochId, msg.sender, net);
    }

    function sweep(uint256 epochId) external nonReentrant {
        Epoch storage e = epochs[epochId];
        require(e.drawn, "not drawn");
        require(block.timestamp >= e.drawnAt + SWEEP_DELAY, "sweep not open yet");

        for (uint256 i = 0; i < e.winners.length; i++) {
            address winner = e.winners[i];
            if (e.claimed[winner]) continue;
            uint256 gross = _payoutOwed(e, winner);
            if (gross == 0) continue;
            e.claimed[winner] = true;
            uint256 net = _settle(winner, gross);
            emit Swept(epochId, winner, net);
        }
    }

    /// @notice Testnet convenience: lets the keeper treat an epoch's 3-day
    /// self-claim window as already elapsed, so sweep() can be exercised on demand
    /// instead of waiting out SWEEP_DELAY for real. Mirrors forceEndEpoch's role
    /// for the epoch's own end time. Rewinding drawnAt also closes claim() at the
    /// same moment, which is the correct effect (the two windows are two sides of
    /// the same boundary) — not a side effect to work around.
    /// MUST be locked out (see revokeRole) before this pool holds real winners it
    /// can force out of a real 3-day grace period.
    function forceSweepReady(uint256 epochId) external onlyRole(KEEPER_ROLE) {
        Epoch storage e = epochs[epochId];
        require(e.drawn, "not drawn");
        e.drawnAt = uint64(block.timestamp - SWEEP_DELAY);
    }

    /// @dev Takes the 5% cut out of a gross prize and splits it in half: 2.5% always
    /// tops up vaultReserve, regardless of referral status. The other 2.5% is pushed
    /// straight to the winner's referrer wallet if they have one — falling back to
    /// pendingRef (claimReferral()) only if that transfer fails, so a broken/reverting
    /// referrer address can never block the winner's own payout — or to vaultDev if
    /// the winner was unreferred. Returns the net amount paid to the winner.
    function _settle(address winner, uint256 gross) private returns (uint256) {
        uint256 cut = (gross * REFERRAL_BPS) / 10000;
        uint256 net = gross - cut;

        uint256 reserveShare = cut / 2;
        uint256 otherShare = cut - reserveShare;
        vaultReserve += reserveShare;

        address ref = refBy[winner];
        if (ref != address(0)) {
            if (!_tryPayReferral(ref, otherShare)) {
                pendingRef[ref] += otherShare;
                emit ReferralAccrued(ref, otherShare);
            }
        } else {
            vaultDev += otherShare;
        }
        emit VaultAccrued(reserveShare, ref == address(0) ? otherShare : 0);

        poolToken.safeTransfer(winner, net);
        return net;
    }

    /// @dev Plain low-level transfer (not SafeERC20) so a reverting/blacklisting
    /// referrer address fails softly instead of reverting the caller's whole claim/sweep.
    function _tryPayReferral(address ref, uint256 amount) private returns (bool) {
        (bool success, bytes memory data) =
            address(poolToken).call(abi.encodeWithSelector(IERC20.transfer.selector, ref, amount));
        bool ok = success && (data.length == 0 || abi.decode(data, (bool)));
        if (ok) emit ReferralPaid(ref, amount);
        return ok;
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
    // Vault withdrawals — internal counters only; funds leave the contract only here.
    // ---------------------------------------------------------------------

    /// @notice Compensates incidents (hack, bug that lost funds). Locked to only work
    /// while paused, so touching reserve forces the multisig to publicly pause first —
    /// no silent draw-down while the pool looks normal.
    function withdrawReserve(uint256 amount, address to, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        nonReentrant
    {
        require(to != address(0), "zero address");
        require(amount <= vaultReserve, "insufficient reserve");
        vaultReserve -= amount;
        poolToken.safeTransfer(to, amount);
        emit VaultWithdrawn(true, to, amount, reason);
    }

    /// @notice Regular, predictable operating costs (server, community, marketing).
    /// No pause condition — this is expected to move often.
    function withdrawDev(uint256 amount, address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "zero address");
        require(amount <= vaultDev, "insufficient dev balance");
        vaultDev -= amount;
        poolToken.safeTransfer(to, amount);
        emit VaultWithdrawn(false, to, amount, "");
    }

    // ---------------------------------------------------------------------
    // Deploying pool liquidity into external yield sources (V5). Generic by
    // design - takes a target address and raw calldata rather than one fixed
    // protocol's function signatures, so a new pool can be used without another
    // contract upgrade. Two guardrails keep that generality from becoming a
    // blank check: a target must be explicitly whitelisted (and wait out
    // TARGET_TIMELOCK after being proposed) before it can be called at all, and
    // no single target may ever hold more than half of whatever's currently
    // deployed - money is always split across at least two pools once a second
    // one is in use.
    // ---------------------------------------------------------------------

    function proposeAllowedTarget(address target) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(target != address(0), "zero address");
        uint256 allowedAt = block.timestamp + TARGET_TIMELOCK;
        targetAllowedAt[target] = allowedAt;
        emit AllowedTargetProposed(target, allowedAt);
    }

    /// @notice Immediate, unlike proposing - there is no reason to delay turning
    /// a target back off.
    function revokeAllowedTarget(address target) external onlyRole(DEFAULT_ADMIN_ROLE) {
        targetAllowedAt[target] = 0;
        emit AllowedTargetRevoked(target);
    }

    function isTargetAllowed(address target) public view returns (bool) {
        uint256 allowedAt = targetAllowedAt[target];
        return allowedAt != 0 && block.timestamp >= allowedAt;
    }

    /// @notice Admin-only escape hatch to move pool liquidity into (or back out of)
    /// a whitelisted external protocol. Requires pausing first, same as
    /// withdrawReserve, so a fund movement this size can never happen silently
    /// while the pool looks normal to depositors.
    function executeExternalCall(address target, uint256 approveAmount, bytes calldata data)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        nonReentrant
        returns (bytes memory)
    {
        require(isTargetAllowed(target), "target not allowed yet");

        if (approveAmount > 0) {
            poolToken.forceApprove(target, approveAmount);
        }

        uint256 balBefore = poolToken.balanceOf(address(this));
        (bool success, bytes memory result) = target.call(data);
        require(success, "external call failed");
        uint256 balAfter = poolToken.balanceOf(address(this));

        int256 delta = _updateExternalDeployment(target, balBefore, balAfter);
        emit ExternalCallExecuted(target, approveAmount, data, delta);
        return result;
    }

    /// @dev Split out of executeExternalCall purely to keep that function's stack
    /// shallow enough to compile without viaIR - no behavior reason to separate it.
    function _updateExternalDeployment(address target, uint256 balBefore, uint256 balAfter) private returns (int256) {
        if (balAfter < balBefore) {
            // Net outflow to `target` - measured from the actual balance change,
            // not approveAmount, so this stays correct even if the call pulled
            // less than it was approved for.
            uint256 sent = balBefore - balAfter;
            uint256 newTargetTotal = externalDeployed[target] + sent;
            uint256 newGrandTotal = totalExternalDeployed + sent;
            if (totalExternalDeployed > 0) {
                require(newTargetTotal * 10000 <= newGrandTotal * MAX_SINGLE_TARGET_BPS, "exceeds single-pool cap");
            }
            externalDeployed[target] = newTargetTotal;
            totalExternalDeployed = newGrandTotal;
            return -int256(sent);
        }
        if (balAfter > balBefore) {
            // Net inflow from `target` - a withdrawal, possibly including yield.
            // Yield earned above what this contract tracked as deployed there
            // isn't "un-deployed" from anywhere, so the reduction clamps at what
            // was actually on record.
            uint256 received = balAfter - balBefore;
            uint256 deployedHere = externalDeployed[target];
            uint256 reduce = received > deployedHere ? deployedHere : received;
            externalDeployed[target] = deployedHere - reduce;
            totalExternalDeployed = totalExternalDeployed > reduce ? totalExternalDeployed - reduce : 0;
            return int256(received);
        }
        return 0;
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
