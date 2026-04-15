// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ExecutionGuard, ISwapRouterLike} from "../src/ExecutionGuard.sol";
import {PolicyVault} from "../src/PolicyVault.sol";
import {TEEType} from "@iexec-nox/nox-protocol-contracts/contracts/shared/TypeUtils.sol";
import "encrypted-types/EncryptedTypes.sol";

interface Vm {
    function etch(address target, bytes calldata newRuntimeBytecode) external;
}

contract MockNoxCompute {
    uint256 private _counter;

    mapping(bytes32 => bytes32) public values;
    mapping(bytes32 => bool) public boolHandles;
    mapping(bytes32 => bool) public publiclyDecryptable;

    function wrapAsPublicHandle(bytes32 raw, TEEType) external returns (bytes32 handle) {
        handle = _nextHandle();
        values[handle] = raw;
    }

    function validateInputProof(bytes32 handle, address, bytes calldata, TEEType) external {
        if (values[handle] == bytes32(0)) {
            values[handle] = handle;
        }
    }

    function le(bytes32 leftHandOperand, bytes32 rightHandOperand) external returns (bytes32 result) {
        result = _nextHandle();
        boolHandles[result] = true;
        publiclyDecryptable[result] = true;
        values[result] = uint256(values[leftHandOperand]) <= uint256(values[rightHandOperand]) ? bytes32(uint256(1)) : bytes32(0);
    }

    function allow(bytes32, address) external {}
    function allowTransient(bytes32, address) external {}
    function disallowTransient(bytes32, address) external {}
    function allowPublicDecryption(bytes32 handle) external {
        publiclyDecryptable[handle] = true;
    }

    function isPubliclyDecryptable(bytes32 handle) external view returns (bool) {
        return publiclyDecryptable[handle];
    }

    function validateDecryptionProof(bytes32 handle, bytes calldata) external view returns (bytes memory) {
        if (boolHandles[handle]) {
            if (uint256(values[handle]) == 0) {
                return hex"00";
            }
            return hex"01";
        }
        return abi.encodePacked(values[handle]);
    }

    receive() external payable {}
    fallback() external payable {}

    function _nextHandle() private returns (bytes32 handle) {
        _counter += 1;
        handle = bytes32(_counter);
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals) {
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");

        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockSwapRouter {
    function exactInputSingle(
        ISwapRouterLike.ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        require(
            MockERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn),
            "transfer in failed"
        );
        amountOut = params.amountIn;
        require(amountOut >= params.amountOutMinimum, "too little out");
        MockERC20(params.tokenOut).mint(params.recipient, amountOut);
    }
}

contract ExecutionGuardTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant NOX_COMPUTE = 0x39847AeBa923Cc7367d4684194091D022B3F8548;

    function _installMockNoxCompute() private {
        MockNoxCompute mock = new MockNoxCompute();
        vm.etch(NOX_COMPUTE, address(mock).code);
    }

    function testExactInputSwapAndSettlementFlow() public {
        _installMockNoxCompute();
        PolicyVault vault = new PolicyVault(address(this));
        MockERC20 sessionAsset = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 arb = new MockERC20("Mock ARB", "mARB", 18);
        MockSwapRouter router = new MockSwapRouter();

        bytes32 whitelistRoot = keccak256(bytes("ARB,ETH,LINK,USDC"));
        bytes32 tokenHash = keccak256(bytes("ARB"));

        vault.registerExecutionWallet(address(this));
        vault.updatePolicyWithNox(
            externalEuint256.wrap(bytes32(uint256(1_000))),
            hex"00",
            externalEuint256.wrap(bytes32(uint256(80))),
            hex"00",
            bytes32(uint256(33)),
            bytes32(uint256(44)),
            whitelistRoot,
            "uniswap-v3",
            "ipfs://policy-2"
        );

        ExecutionGuard guard =
            new ExecutionGuard(address(vault), address(this), address(sessionAsset), address(router), 3_000);
        vault.registerExecutionController(address(guard));

        guard.syncPolicyWhitelistRoot();
        guard.setAllowedToken(tokenHash, true);
        guard.setAllowedTokenAddress(address(arb), true);

        vault.openSession(1_000, 1, 12);

        sessionAsset.mint(address(this), 1_000);
        sessionAsset.approve(address(guard), 1_000);
        guard.fundSessionAsset(500, keccak256(bytes("fund-1")));
        require(guard.sessionAssetBalance() == 500, "funded balance mismatch");
        guard.prepareConfidenceApproval(92);

        uint256 amountOut = guard.executeExactInputSingle(
            tokenHash,
            address(arb),
            3_000,
            300,
            290,
            300,
            92,
            hex"01",
            keccak256(bytes("swap-1"))
        );

        require(amountOut == 300, "swap output mismatch");
        require(guard.sessionAssetBalance() == 200, "remaining session asset mismatch");
        require(arb.balanceOf(address(guard)) == 300, "output token should sit in the guard");
        require(vault.remainingSessionBudget() == 700, "budget was not consumed");

        address[] memory sweepTokens = new address[](1);
        sweepTokens[0] = address(arb);
        guard.settleSessionAssets(sweepTokens, 980, keccak256(bytes("settle-1")));

        require(sessionAsset.balanceOf(address(guard)) == 0, "session asset should be swept");
        require(arb.balanceOf(address(guard)) == 0, "output token should be swept");
        require(sessionAsset.balanceOf(address(this)) == 700, "session asset should be returned to owner");
        require(arb.balanceOf(address(this)) == 300, "output token should be returned to owner");
        require(guard.lastSettlementAt() > 0, "last settlement timestamp missing");

        (bool active, , , , , , uint256 spentAmountUsd, uint256 settledAmountUsd) = vault.sessionSnapshot();
        require(!active, "session should be settled");
        require(spentAmountUsd == 300, "spent amount mismatch");
        require(settledAmountUsd == 980, "settled amount mismatch");
    }

    function testPreviewRejectsOutOfSyncWhitelistReference() public {
        _installMockNoxCompute();
        PolicyVault vault = new PolicyVault(address(this));
        MockERC20 sessionAsset = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 arb = new MockERC20("Mock ARB", "mARB", 18);
        MockSwapRouter router = new MockSwapRouter();

        bytes32 initialWhitelistRoot = keccak256(bytes("ARB,ETH"));
        bytes32 rotatedWhitelistRoot = keccak256(bytes("ARB,ETH,LINK"));
        bytes32 tokenHash = keccak256(bytes("ARB"));

        vault.registerExecutionWallet(address(this));
        vault.updatePolicyWithNox(
            externalEuint256.wrap(bytes32(uint256(1_000))),
            hex"00",
            externalEuint256.wrap(bytes32(uint256(80))),
            hex"00",
            bytes32(uint256(303)),
            bytes32(uint256(404)),
            initialWhitelistRoot,
            "uniswap-v3",
            "ipfs://policy-initial"
        );

        ExecutionGuard guard =
            new ExecutionGuard(address(vault), address(this), address(sessionAsset), address(router), 3_000);
        vault.registerExecutionController(address(guard));

        guard.syncPolicyWhitelistRoot();
        guard.setAllowedToken(tokenHash, true);
        guard.setAllowedTokenAddress(address(arb), true);
        vault.openSession(1_000, 1, 12);
        guard.prepareConfidenceApproval(90);

        vault.updatePolicyWithNox(
            externalEuint256.wrap(bytes32(uint256(1_100))),
            hex"00",
            externalEuint256.wrap(bytes32(uint256(85))),
            hex"00",
            bytes32(uint256(333)),
            bytes32(uint256(444)),
            rotatedWhitelistRoot,
            "uniswap-v3",
            "ipfs://policy-rotated"
        );

        (bool allowed, string memory reason) = guard.previewExecution(tokenHash, address(this), 100, 90);
        require(!allowed, "execution should be blocked after policy rotation");
        require(
            keccak256(bytes(reason)) == keccak256(bytes("token reference list is out of sync with vault policy")),
            "unexpected rejection reason"
        );
    }
}
