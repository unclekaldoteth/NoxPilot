// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {DemoArbToken} from "../src/DemoArbToken.sol";
import {ExecutionGuard} from "../src/ExecutionGuard.sol";
import {NoxPilotConfidentialERC20Wrapper} from "../src/NoxPilotConfidentialERC20Wrapper.sol";

interface Vm {
    function envAddress(string calldata key) external returns (address);
    function envOr(string calldata key, address defaultValue) external returns (address);
    function envOr(string calldata key, uint256 defaultValue) external returns (uint256);
    function envUint(string calldata key) external returns (uint256);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

abstract contract Script {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function createAndInitializePoolIfNecessary(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external payable returns (address pool);

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

contract BootstrapArbExecutionLane is Script {
    error InvalidSeedAmount();
    error InsufficientSessionAssetBalance(uint256 available, uint256 required);
    error NotGuardAdmin(address expectedAdmin, address signer);

    uint256 private constant Q96 = 2 ** 96;
    uint256 private constant Q192 = 2 ** 192;
    uint256 private constant DEFAULT_SESSION_ASSET_SEED_AMOUNT = 5_000_000;
    uint256 private constant DEFAULT_USDC_E6_PER_ARB = 125_000;
    address private constant DEFAULT_POSITION_MANAGER = 0xe78BE631F0E83557963D7d176b64ed8f7f148E48;

    function run()
        external
        returns (
            DemoArbToken arbToken,
            NoxPilotConfidentialERC20Wrapper arbWrapper,
            address pool,
            uint256 seededUsdcAmount,
            uint256 positionTokenId
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        address deployer = VM.addr(privateKey);
        address guardAddress = VM.envAddress("EXECUTION_GUARD_ADDRESS");
        ExecutionGuard guard = ExecutionGuard(guardAddress);

        if (guard.admin() != deployer) revert NotGuardAdmin(guard.admin(), deployer);

        address sessionAsset = VM.envAddress("SESSION_ASSET_ADDRESS");
        uint24 fee = uint24(VM.envUint("DEFAULT_POOL_FEE"));
        address positionManagerAddress = VM.envOr("ARB_BOOTSTRAP_POSITION_MANAGER_ADDRESS", DEFAULT_POSITION_MANAGER);
        uint256 sessionAssetSeedAmount =
            VM.envOr("ARB_BOOTSTRAP_SESSION_ASSET_SEED_AMOUNT", DEFAULT_SESSION_ASSET_SEED_AMOUNT);
        uint256 priceUsdcE6PerArb = VM.envOr("ARB_BOOTSTRAP_USDC_E6_PER_ARB", DEFAULT_USDC_E6_PER_ARB);

        if (sessionAssetSeedAmount == 0 || priceUsdcE6PerArb == 0) revert InvalidSeedAmount();

        uint256 availableSessionAsset = IERC20(sessionAsset).balanceOf(deployer);
        if (availableSessionAsset < sessionAssetSeedAmount) {
            revert InsufficientSessionAssetBalance(availableSessionAsset, sessionAssetSeedAmount);
        }

        VM.startBroadcast(privateKey);

        arbToken = new DemoArbToken(deployer);
        arbWrapper = new NoxPilotConfidentialERC20Wrapper(
            IERC20(address(arbToken)),
            "NoxPilot Confidential ARB",
            "nARB",
            "ipfs://noxpilot/arb"
        );
        guard.setConfidentialWrapper(address(arbToken), address(arbWrapper), true);

        seededUsdcAmount = sessionAssetSeedAmount;

        uint256 arbSeedAmount = (seededUsdcAmount * 1e18) / priceUsdcE6PerArb;
        arbToken.mint(deployer, arbSeedAmount);

        IERC20(sessionAsset).approve(positionManagerAddress, seededUsdcAmount);
        IERC20(address(arbToken)).approve(positionManagerAddress, arbSeedAmount);

        (
            address token0,
            address token1,
            uint256 amount0Desired,
            uint256 amount1Desired
        ) = _orderPoolTokens(sessionAsset, address(arbToken), seededUsdcAmount, arbSeedAmount);

        uint160 sqrtPriceX96 = _sqrtPriceX96(amount0Desired, amount1Desired);
        pool = INonfungiblePositionManager(positionManagerAddress).createAndInitializePoolIfNecessary(
            token0,
            token1,
            fee,
            sqrtPriceX96
        );

        (positionTokenId,,,) = INonfungiblePositionManager(positionManagerAddress).mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: -887220,
                tickUpper: 887220,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: deployer,
                deadline: block.timestamp + 15 minutes
            })
        );

        VM.stopBroadcast();
    }

    function _orderPoolTokens(
        address sessionAsset,
        address arbToken,
        uint256 sessionAssetAmount,
        uint256 arbAmount
    ) internal pure returns (address token0, address token1, uint256 amount0Desired, uint256 amount1Desired) {
        if (sessionAsset < arbToken) {
            token0 = sessionAsset;
            token1 = arbToken;
            amount0Desired = sessionAssetAmount;
            amount1Desired = arbAmount;
        } else {
            token0 = arbToken;
            token1 = sessionAsset;
            amount0Desired = arbAmount;
            amount1Desired = sessionAssetAmount;
        }
    }

    function _sqrtPriceX96(uint256 amount0Desired, uint256 amount1Desired) internal pure returns (uint160) {
        uint256 ratioX192 = Math.mulDiv(amount1Desired, Q192, amount0Desired);
        return uint160(Math.sqrt(ratioX192));
    }
}
