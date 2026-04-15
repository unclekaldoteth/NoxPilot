// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ExecutionGuard} from "../src/ExecutionGuard.sol";
import {PolicyVault} from "../src/PolicyVault.sol";

interface Vm {
    function envAddress(string calldata key) external returns (address);
    function envUint(string calldata key) external returns (uint256);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

abstract contract Script {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

contract Deploy is Script {
    function run() external returns (PolicyVault vault, ExecutionGuard guard) {
        address owner = VM.envAddress("OWNER_ADDRESS");
        address executionWallet = VM.envAddress("EXECUTION_WALLET_ADDRESS");
        address sessionAsset = VM.envAddress("SESSION_ASSET_ADDRESS");
        address swapRouter = VM.envAddress("SWAP_ROUTER_ADDRESS");
        uint256 defaultPoolFee = VM.envUint("DEFAULT_POOL_FEE");
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        address deployer = VM.addr(privateKey);

        VM.startBroadcast(privateKey);

        vault = new PolicyVault(deployer);
        vault.registerExecutionWallet(executionWallet);

        guard = new ExecutionGuard(address(vault), owner, sessionAsset, swapRouter, uint24(defaultPoolFee));
        vault.registerExecutionController(address(guard));

        if (owner != deployer) {
            vault.registerOwner(owner);
        }

        VM.stopBroadcast();
    }
}
