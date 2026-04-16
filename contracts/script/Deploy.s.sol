// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ExecutionGuard} from "../src/ExecutionGuard.sol";
import {NoxPilotConfidentialERC20Wrapper} from "../src/NoxPilotConfidentialERC20Wrapper.sol";
import {PolicyVault} from "../src/PolicyVault.sol";

interface Vm {
    function envAddress(string calldata key) external returns (address);
    function envOr(string calldata key, address defaultValue) external returns (address);
    function envOr(string calldata key, string calldata defaultValue) external returns (string memory);
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
        address weth = VM.envOr("TOKEN_ETH_ADDRESS", address(0));
        address arb = VM.envOr("TOKEN_ARB_ADDRESS", address(0));
        address link = VM.envOr("TOKEN_LINK_ADDRESS", address(0));

        VM.startBroadcast(privateKey);

        vault = new PolicyVault(deployer);
        vault.registerExecutionWallet(executionWallet);

        guard = new ExecutionGuard(address(vault), deployer, sessionAsset, swapRouter, uint24(defaultPoolFee));
        vault.registerExecutionController(address(guard));

        _deployWrapperIfConfigured(guard, weth, "NoxPilot Confidential WETH", "nWETH", "ipfs://noxpilot/weth");
        _deployWrapperIfConfigured(guard, arb, "NoxPilot Confidential ARB", "nARB", "ipfs://noxpilot/arb");
        _deployWrapperIfConfigured(guard, link, "NoxPilot Confidential LINK", "nLINK", "ipfs://noxpilot/link");

        if (owner != deployer) {
            guard.registerAdmin(owner);
            vault.registerOwner(owner);
        } else {
            guard.registerAdmin(owner);
        }

        VM.stopBroadcast();
    }

    function _deployWrapperIfConfigured(
        ExecutionGuard guard,
        address underlying,
        string memory name,
        string memory symbol,
        string memory contractURI
    ) internal returns (NoxPilotConfidentialERC20Wrapper wrapper) {
        if (underlying == address(0)) {
            return wrapper;
        }

        wrapper = new NoxPilotConfidentialERC20Wrapper(IERC20(underlying), name, symbol, contractURI);
        guard.setConfidentialWrapper(underlying, address(wrapper), true);
    }
}
