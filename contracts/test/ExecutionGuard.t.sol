// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ExecutionGuard, ISwapRouterLike} from "../src/ExecutionGuard.sol";
import {NoxPilotConfidentialERC20Wrapper} from "../src/NoxPilotConfidentialERC20Wrapper.sol";
import {PolicyVault} from "../src/PolicyVault.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TEEType} from "@iexec-nox/nox-protocol-contracts/contracts/shared/TypeUtils.sol";
import "encrypted-types/EncryptedTypes.sol";

interface Vm {
    function etch(address target, bytes calldata newRuntimeBytecode) external;
}

contract MockNoxCompute {
    uint256 private _counter;

    mapping(bytes32 => bool) public exists;
    mapping(bytes32 => uint256) public values;
    mapping(bytes32 => bool) public boolHandles;
    mapping(bytes32 => bool) public publiclyDecryptable;
    mapping(bytes32 => mapping(address => bool)) public allowedHandles;
    mapping(bytes32 => mapping(address => bool)) public transientAllowedHandles;

    function wrapAsPublicHandle(bytes32 raw, TEEType teeType) external returns (bytes32 handle) {
        handle = _nextHandle();
        exists[handle] = true;
        values[handle] = uint256(raw);
        if (teeType == TEEType.Bool) {
            boolHandles[handle] = true;
        }
        allowedHandles[handle][msg.sender] = true;
    }

    function validateInputProof(bytes32 handle, address sender, bytes calldata, TEEType teeType) external {
        if (!exists[handle]) {
            exists[handle] = true;
            values[handle] = uint256(handle);
            if (teeType == TEEType.Bool) {
                boolHandles[handle] = true;
            }
        }
        allowedHandles[handle][sender] = true;
        allowedHandles[handle][msg.sender] = true;
    }

    function add(bytes32 leftHandOperand, bytes32 rightHandOperand) external returns (bytes32 result) {
        result = _newUintHandle(_valueOf(leftHandOperand) + _valueOf(rightHandOperand));
    }

    function sub(bytes32 leftHandOperand, bytes32 rightHandOperand) external returns (bytes32 result) {
        result = _newUintHandle(_valueOf(leftHandOperand) - _valueOf(rightHandOperand));
    }

    function safeAdd(
        bytes32 leftHandOperand,
        bytes32 rightHandOperand
    ) external returns (bytes32 success, bytes32 result) {
        uint256 leftValue = _valueOf(leftHandOperand);
        uint256 rightValue = _valueOf(rightHandOperand);
        unchecked {
            uint256 sum = leftValue + rightValue;
            bool ok = sum >= leftValue;
            success = _newBoolHandle(ok);
            result = _newUintHandle(ok ? sum : 0);
        }
    }

    function safeSub(
        bytes32 leftHandOperand,
        bytes32 rightHandOperand
    ) external returns (bytes32 success, bytes32 result) {
        uint256 leftValue = _valueOf(leftHandOperand);
        uint256 rightValue = _valueOf(rightHandOperand);
        bool ok = leftValue >= rightValue;
        success = _newBoolHandle(ok);
        result = _newUintHandle(ok ? leftValue - rightValue : 0);
    }

    function select(bytes32 condition, bytes32 ifTrue, bytes32 ifFalse) external returns (bytes32 result) {
        bytes32 chosen = _valueOf(condition) != 0 ? ifTrue : ifFalse;
        if (boolHandles[chosen]) {
            result = _newBoolHandle(_valueOf(chosen) != 0);
            return result;
        }
        result = _newUintHandle(_valueOf(chosen));
    }

    function le(bytes32 leftHandOperand, bytes32 rightHandOperand) external returns (bytes32 result) {
        result = _newBoolHandle(_valueOf(leftHandOperand) <= _valueOf(rightHandOperand));
    }

    function allow(bytes32 handle, address account) external {
        allowedHandles[handle][account] = true;
    }

    function allowTransient(bytes32 handle, address account) external {
        transientAllowedHandles[handle][account] = true;
    }

    function disallowTransient(bytes32 handle, address account) external {
        transientAllowedHandles[handle][account] = false;
    }

    function isAllowed(bytes32 handle, address account) external view returns (bool) {
        return
            _isPublicHandle(handle) ||
            publiclyDecryptable[handle] ||
            allowedHandles[handle][account] ||
            transientAllowedHandles[handle][account];
    }

    function validateAllowedForAll(address account, bytes32[] calldata handles) external view {
        uint256 length = handles.length;
        for (uint256 i = 0; i < length; i++) {
            require(
                _isPublicHandle(handles[i]) ||
                    publiclyDecryptable[handles[i]] ||
                    allowedHandles[handles[i]][account] ||
                    transientAllowedHandles[handles[i]][account],
                "not allowed"
            );
        }
    }

    function addViewer(bytes32, address) external {}

    function isViewer(bytes32 handle, address viewer) external view returns (bool) {
        return _isPublicHandle(handle) || publiclyDecryptable[handle] || allowedHandles[handle][viewer];
    }

    function allowPublicDecryption(bytes32 handle) external {
        publiclyDecryptable[handle] = true;
    }

    function isPubliclyDecryptable(bytes32 handle) external view returns (bool) {
        return publiclyDecryptable[handle];
    }

    function validateDecryptionProof(bytes32 handle, bytes calldata) external view returns (bytes memory) {
        if (boolHandles[handle]) {
            if (_valueOf(handle) == 0) {
                return hex"00";
            }
            return hex"01";
        }
        return abi.encodePacked(bytes32(_valueOf(handle)));
    }

    function setKmsPublicKey(bytes calldata) external {}
    function setGateway(address) external {}
    function setProofExpirationDuration(uint256) external {}

    receive() external payable {}
    fallback() external payable {}

    function _nextHandle() private returns (bytes32 handle) {
        _counter += 1;
        handle = bytes32(_counter);
    }

    function _newUintHandle(uint256 value) private returns (bytes32 handle) {
        handle = _nextHandle();
        exists[handle] = true;
        values[handle] = value;
        allowedHandles[handle][msg.sender] = true;
    }

    function _newBoolHandle(bool value) private returns (bytes32 handle) {
        handle = _nextHandle();
        exists[handle] = true;
        values[handle] = value ? 1 : 0;
        boolHandles[handle] = true;
        allowedHandles[handle][msg.sender] = true;
    }

    function _valueOf(bytes32 handle) private view returns (uint256) {
        if (!exists[handle]) {
            if (_isPublicHandle(handle)) {
                return 0;
            }
            return uint256(handle);
        }
        return values[handle];
    }

    function _isPublicHandle(bytes32 handle) private pure returns (bool) {
        return (handle[6] & bytes1(uint8(1))) == 0;
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

    function transfer(address to, uint256 amount) external virtual returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external virtual returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");

        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockFeeOnTransferERC20 is MockERC20 {
    constructor(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)
        MockERC20(tokenName, tokenSymbol, tokenDecimals)
    {}

    function transferFrom(address from, address to, uint256 amount) external virtual override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");

        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount - 1;
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

    function _setupFlow()
        private
        returns (
            PolicyVault vault,
            ExecutionGuard guard,
            MockERC20 sessionAsset,
            MockERC20 arb,
            MockSwapRouter router,
            bytes32 tokenHash
        )
    {
        _installMockNoxCompute();
        vault = new PolicyVault(address(this));
        sessionAsset = new MockERC20("Mock USDC", "mUSDC", 6);
        arb = new MockERC20("Mock ARB", "mARB", 18);
        router = new MockSwapRouter();

        bytes32 whitelistRoot = keccak256(bytes("ARB,ETH,LINK,USDC"));
        tokenHash = keccak256(bytes("ARB"));

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

        guard = new ExecutionGuard(address(vault), address(this), address(sessionAsset), address(router), 3_000);
        vault.registerExecutionController(address(guard));

        guard.syncPolicyWhitelistRoot();
        guard.setAllowedToken(tokenHash, true);
        guard.setAllowedTokenAddress(address(arb), true);
    }

    function _openAndFundSession(PolicyVault vault, ExecutionGuard guard, MockERC20 sessionAsset) private {
        vault.openSession(1_000, 1, 12);
        sessionAsset.mint(address(this), 1_000);
        sessionAsset.approve(address(guard), 1_000);
        guard.fundSessionAsset(500, keccak256(bytes("fund-1")));
    }

    function _executeSwap(ExecutionGuard guard, bytes32 tokenHash, address tokenOut) private returns (uint256 amountOut) {
        guard.prepareConfidenceApproval(92);
        amountOut = guard.executeExactInputSingle(
            tokenHash,
            tokenOut,
            3_000,
            300,
            290,
            300,
            92,
            hex"01",
            keccak256(bytes("swap-1"))
        );
    }

    function testExactInputSwapAndSettlementFlow() public {
        (
            PolicyVault vault,
            ExecutionGuard guard,
            MockERC20 sessionAsset,
            MockERC20 arb,
            MockSwapRouter _router,
            bytes32 tokenHash
        ) = _setupFlow();
        _router;

        _openAndFundSession(vault, guard, sessionAsset);
        require(guard.sessionAssetBalance() == 500, "funded balance mismatch");

        uint256 amountOut = _executeSwap(guard, tokenHash, address(arb));

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

    function testWrapLastOutputCreatesConfidentialPositionAndSupportsUnwrap() public {
        (
            PolicyVault vault,
            ExecutionGuard guard,
            MockERC20 sessionAsset,
            MockERC20 arb,
            MockSwapRouter _router,
            bytes32 tokenHash
        ) = _setupFlow();
        _router;

        NoxPilotConfidentialERC20Wrapper wrapper = new NoxPilotConfidentialERC20Wrapper(
            IERC20(address(arb)),
            "NoxPilot Confidential ARB",
            "nARB",
            "ipfs://noxpilot/arb"
        );
        guard.setConfidentialWrapper(address(arb), address(wrapper), true);

        _openAndFundSession(vault, guard, sessionAsset);
        _executeSwap(guard, tokenHash, address(arb));

        (bytes32 amountHandle, bytes32 balanceHandle) = guard.wrapLastOutput(
            address(arb),
            300,
            keccak256(bytes("wrap-1"))
        );

        require(amountHandle != bytes32(0), "wrapped amount handle missing");
        require(balanceHandle != bytes32(0), "confidential balance handle missing");
        require(guard.lastWrapToken() == address(arb), "last wrapped token mismatch");
        require(guard.lastWrapWrapper() == address(wrapper), "last wrapper mismatch");
        require(guard.lastWrapAmount() == 300, "last wrap amount mismatch");
        require(guard.lastWrapAmountHandle() == amountHandle, "stored wrap amount handle mismatch");
        require(guard.lastWrapBalanceHandle() == balanceHandle, "stored balance handle mismatch");
        require(wrapper.confidentialBalanceHandleOf(address(this)) == balanceHandle, "wrapper balance handle mismatch");
        require(arb.balanceOf(address(guard)) == 0, "guard output balance should be wrapped");
        require(arb.balanceOf(address(wrapper)) == 300, "wrapper should hold underlying after wrap");

        euint256 unwrapRequestId = wrapper.unwrap(
            address(this),
            address(this),
            euint256.wrap(balanceHandle)
        );
        wrapper.finalizeUnwrap(unwrapRequestId, abi.encodePacked(bytes32(uint256(300))));

        require(arb.balanceOf(address(wrapper)) == 0, "wrapper should release underlying after finalize");
        require(arb.balanceOf(address(this)) == 300, "owner should receive unwrapped underlying");
    }

    function testWrapLastOutputRevertsWithoutConfiguredWrapper() public {
        (
            PolicyVault vault,
            ExecutionGuard guard,
            MockERC20 sessionAsset,
            MockERC20 arb,
            MockSwapRouter _router,
            bytes32 tokenHash
        ) = _setupFlow();
        _router;

        _openAndFundSession(vault, guard, sessionAsset);
        _executeSwap(guard, tokenHash, address(arb));

        (bool success, bytes memory revertData) = address(guard).call(
            abi.encodeCall(
                ExecutionGuard.wrapLastOutput,
                (address(arb), 300, keccak256(bytes("wrap-missing")))
            )
        );

        require(!success, "wrap should fail without configured wrapper");
        require(
            bytes4(revertData) == ExecutionGuard.WrapperNotConfigured.selector,
            "unexpected revert selector"
        );
    }

    function testConfidentialWrapperRejectsFeeOnTransferUnderlying() public {
        _installMockNoxCompute();
        MockFeeOnTransferERC20 feeToken = new MockFeeOnTransferERC20("Fee Token", "FEE", 18);
        NoxPilotConfidentialERC20Wrapper wrapper = new NoxPilotConfidentialERC20Wrapper(
            IERC20(address(feeToken)),
            "NoxPilot Confidential FEE",
            "nFEE",
            "ipfs://noxpilot/fee"
        );

        feeToken.mint(address(this), 100);
        feeToken.approve(address(wrapper), 100);

        (bool success, bytes memory revertData) = address(wrapper).call(
            abi.encodeCall(NoxPilotConfidentialERC20Wrapper.wrap, (address(this), 100))
        );

        require(!success, "fee-on-transfer token should be rejected");
        require(
            bytes4(revertData) == NoxPilotConfidentialERC20Wrapper.FeeOnTransferUnderlyingUnsupported.selector,
            "unexpected fee-token revert selector"
        );
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
