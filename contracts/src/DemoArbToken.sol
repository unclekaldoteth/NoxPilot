// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DemoArbToken
/// @notice Testnet-only ARB-like token used to bootstrap the Arbitrum execution lane
/// when no suitable live ARB/USDC pool exists on Arbitrum Sepolia.
contract DemoArbToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("NoxPilot Demo ARB", "ARB") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
