// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Re-exported so Hardhat compiles ERC1967Proxy's artifact for use by
// Hardhat Ignition when deploying LuckyStakerPool behind a UUPS proxy.
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
