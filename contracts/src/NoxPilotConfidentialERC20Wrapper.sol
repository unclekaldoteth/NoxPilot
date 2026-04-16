// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {IERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC20ToERC7984Wrapper.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC7984Base} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984Base.sol";

/// @title NoxPilotConfidentialERC20Wrapper
/// @notice Concrete confidential wrapper for a supported ERC-20. The deposit
/// itself is public, while post-wrap balances use Nox ERC-7984 handles.
contract NoxPilotConfidentialERC20Wrapper is ERC7984, IERC20ToERC7984Wrapper, IERC1363Receiver {
    using SafeERC20 for IERC20;

    IERC20 private immutable _underlying;
    uint8 private immutable _decimals;
    mapping(euint256 unwrapAmount => address recipient) private _unwrapRequests;

    error ERC7984UnauthorizedCaller(address caller);
    error InvalidUnwrapRequest(euint256 unwrapRequestId);
    error ERC7984TotalSupplyOverflow();
    error FeeOnTransferUnderlyingUnsupported();

    constructor(
        IERC20 underlying_,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) {
        _underlying = underlying_;
        _decimals = _tryGetAssetDecimals(underlying_);
    }

    function onTransferReceived(
        address,
        address from,
        uint256 amount,
        bytes calldata data
    ) public virtual returns (bytes4) {
        require(underlying() == msg.sender, ERC7984UnauthorizedCaller(msg.sender));
        address to = data.length < 20 ? from : address(bytes20(data));
        _mint(to, Nox.toEuint256(amount));
        return IERC1363Receiver.onTransferReceived.selector;
    }

    function wrap(address to, uint256 amount) public virtual override returns (euint256 wrappedAmount) {
        uint256 balanceBefore = IERC20(underlying()).balanceOf(address(this));
        IERC20(underlying()).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(underlying()).balanceOf(address(this)) != balanceBefore + amount) {
            revert FeeOnTransferUnderlyingUnsupported();
        }
        wrappedAmount = _mint(to, Nox.toEuint256(amount));
        Nox.allowTransient(wrappedAmount, msg.sender);
    }

    function unwrap(
        address from,
        address to,
        euint256 amount
    ) public virtual override returns (euint256) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        return _unwrap(from, to, amount);
    }

    function unwrap(
        address from,
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) public virtual override returns (euint256) {
        return _unwrap(from, to, Nox.fromExternal(encryptedAmount, inputProof));
    }

    function finalizeUnwrap(
        euint256 unwrapRequestId,
        bytes calldata decryptedAmountAndProof
    ) external virtual override {
        address to = unwrapRequester(unwrapRequestId);
        require(to != address(0), InvalidUnwrapRequest(unwrapRequestId));
        delete _unwrapRequests[unwrapRequestId];
        uint256 plaintextAmount = Nox.publicDecrypt(unwrapRequestId, decryptedAmountAndProof);
        IERC20(underlying()).safeTransfer(to, plaintextAmount);
        emit UnwrapFinalized(to, unwrapRequestId, plaintextAmount);
    }

    function decimals() public view virtual override(IERC7984, ERC7984Base) returns (uint8) {
        return _decimals;
    }

    function underlying() public view virtual override returns (address) {
        return address(_underlying);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC7984Base) returns (bool) {
        return
            interfaceId == type(IERC20ToERC7984Wrapper).interfaceId ||
            interfaceId == type(IERC1363Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function inferredTotalSupply() public view virtual override returns (uint256) {
        return IERC20(underlying()).balanceOf(address(this));
    }

    function maxTotalSupply() public view virtual override returns (uint256) {
        return type(uint256).max;
    }

    function unwrapRequester(euint256 unwrapAmount) public view virtual override returns (address) {
        return _unwrapRequests[unwrapAmount];
    }

    function confidentialBalanceHandleOf(address account) external view returns (bytes32) {
        return euint256.unwrap(confidentialBalanceOf(account));
    }

    function confidentialTotalSupplyHandle() external view returns (bytes32) {
        return euint256.unwrap(confidentialTotalSupply());
    }

    function _checkConfidentialTotalSupply() internal virtual {
        if (inferredTotalSupply() > maxTotalSupply()) revert ERC7984TotalSupplyOverflow();
    }

    function _update(
        address from,
        address to,
        euint256 amount
    ) internal virtual override returns (euint256) {
        if (from == address(0)) _checkConfidentialTotalSupply();
        return super._update(from, to, amount);
    }

    function _unwrap(
        address from,
        address to,
        euint256 amount
    ) internal virtual returns (euint256) {
        require(to != address(0), ERC7984InvalidReceiver(to));
        require(
            from == msg.sender || isOperator(from, msg.sender),
            ERC7984UnauthorizedSpender(from, msg.sender)
        );

        euint256 unwrapAmount = _burn(from, amount);
        Nox.allowPublicDecryption(unwrapAmount);
        assert(unwrapRequester(unwrapAmount) == address(0));
        _unwrapRequests[unwrapAmount] = to;
        emit UnwrapRequested(to, unwrapAmount);
        return unwrapAmount;
    }

    function _fallbackUnderlyingDecimals() internal pure virtual returns (uint8) {
        return 18;
    }

    function _tryGetAssetDecimals(IERC20 asset_) private view returns (uint8) {
        (bool success, bytes memory encodedDecimals) = address(asset_).staticcall(
            abi.encodeCall(IERC20Metadata.decimals, ())
        );
        if (success && encodedDecimals.length == 32) return abi.decode(encodedDecimals, (uint8));
        return _fallbackUnderlyingDecimals();
    }
}
