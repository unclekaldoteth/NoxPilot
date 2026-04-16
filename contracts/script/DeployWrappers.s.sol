// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ExecutionGuard} from "../src/ExecutionGuard.sol";
import {NoxPilotConfidentialERC20Wrapper} from "../src/NoxPilotConfidentialERC20Wrapper.sol";

interface Vm {
    function envAddress(string calldata key) external returns (address);
    function envOr(string calldata key, address defaultValue) external returns (address);
    function envOr(string calldata key, bool defaultValue) external returns (bool);
    function envUint(string calldata key) external returns (uint256);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

abstract contract Script {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

contract DeployWrappers is Script {
    error NoWrappersSelected();
    error MissingTokenAddress(string symbol);
    error NotGuardAdmin(address expectedAdmin, address signer);

    function run()
        external
        returns (
            NoxPilotConfidentialERC20Wrapper wethWrapper,
            NoxPilotConfidentialERC20Wrapper arbWrapper,
            NoxPilotConfidentialERC20Wrapper linkWrapper
        )
    {
        address guardAddress = VM.envAddress("EXECUTION_GUARD_ADDRESS");
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        address deployer = VM.addr(privateKey);
        ExecutionGuard guard = ExecutionGuard(guardAddress);

        bool deployWeth = VM.envOr("DEPLOY_WRAPPER_ETH", false);
        bool deployArb = VM.envOr("DEPLOY_WRAPPER_ARB", false);
        bool deployLink = VM.envOr("DEPLOY_WRAPPER_LINK", false);
        if (!deployWeth && !deployArb && !deployLink) revert NoWrappersSelected();

        address weth = VM.envOr("TOKEN_ETH_ADDRESS", address(0));
        address arb = VM.envOr("TOKEN_ARB_ADDRESS", address(0));
        address link = VM.envOr("TOKEN_LINK_ADDRESS", address(0));

        _validateSelection(deployWeth, weth, "ETH");
        _validateSelection(deployArb, arb, "ARB");
        _validateSelection(deployLink, link, "LINK");

        address currentAdmin = guard.admin();
        if (currentAdmin != deployer) revert NotGuardAdmin(currentAdmin, deployer);

        VM.startBroadcast(privateKey);

        wethWrapper = _deployIfMissing(
            guard,
            deployWeth,
            weth,
            "NoxPilot Confidential WETH",
            "nWETH",
            "ipfs://noxpilot/weth"
        );
        arbWrapper = _deployIfMissing(
            guard,
            deployArb,
            arb,
            "NoxPilot Confidential ARB",
            "nARB",
            "ipfs://noxpilot/arb"
        );
        linkWrapper = _deployIfMissing(
            guard,
            deployLink,
            link,
            "NoxPilot Confidential LINK",
            "nLINK",
            "ipfs://noxpilot/link"
        );

        VM.stopBroadcast();
    }

    function _validateSelection(bool selected, address token, string memory symbol) internal pure {
        if (selected && token == address(0)) revert MissingTokenAddress(symbol);
    }

    function _deployIfMissing(
        ExecutionGuard guard,
        bool selected,
        address underlying,
        string memory name,
        string memory symbol,
        string memory contractURI
    ) internal returns (NoxPilotConfidentialERC20Wrapper wrapper) {
        if (!selected || underlying == address(0)) {
            return wrapper;
        }

        address existingWrapper = guard.confidentialWrappers(underlying);
        if (existingWrapper != address(0)) {
            return NoxPilotConfidentialERC20Wrapper(existingWrapper);
        }

        wrapper = new NoxPilotConfidentialERC20Wrapper(IERC20(underlying), name, symbol, contractURI);
        guard.setConfidentialWrapper(underlying, address(wrapper), true);
    }
}
