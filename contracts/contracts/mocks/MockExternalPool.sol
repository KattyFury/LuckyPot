// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal stand-in for an external lending pool (e.g. Vitael), used only
/// to exercise LuckyStakerPool.executeExternalCall in tests. supply() pulls via
/// the caller's existing approval (matching how a real pool would); withdraw()
/// can optionally pay out more than was deposited, to exercise the "yield came
/// back" clamp in _updateExternalDeployment.
contract MockExternalPool {
    IERC20 public immutable token;
    mapping(address => uint256) public supplied;

    constructor(IERC20 _token) {
        token = _token;
    }

    function supply(uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        supplied[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        supplied[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
    }

    /// @notice Test helper: send back more than was ever supplied, simulating yield.
    function withdrawWithBonus(uint256 principal, uint256 bonus) external {
        supplied[msg.sender] -= principal;
        token.transfer(msg.sender, principal + bonus);
    }
}
