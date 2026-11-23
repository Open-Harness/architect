// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

abstract contract BudgetAuthorization is EIP712 {
    error NotAllowed();
    error SignatureExpired(uint256 deadline);
    error InvalidNonce(uint256 expected, uint256 got);
    error BadSignature();

    bytes32 internal constant SPEND_TYPEHASH = keccak256(
        "BudgetSpend(address safe,uint256 hatId,address to,uint128 amount,address signer,uint256 nonce,uint256 deadline)"
    );

    mapping(address => uint256) public nonces;

    constructor() EIP712("Budgets", "1") {}

    function spend(address safe, uint256 hatId, address to, uint128 amount, uint256 nonce) external {
        _authorizeSpend(msg.sender, nonce, safe, hatId, to, amount);
    }

    function spendBySig(
        address safe,
        uint256 hatId,
        address to,
        uint128 amount,
        address signer,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert SignatureExpired(deadline);
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(SPEND_TYPEHASH, safe, hatId, to, amount, signer, nonce, deadline))
        );
        if (!SignatureChecker.isValidSignatureNow(signer, digest, signature)) revert BadSignature();
        _authorizeSpend(signer, nonce, safe, hatId, to, amount);
    }

    function _authorizeSpend(address by, uint256 nonce, address safe, uint256 hatId, address to, uint128 amount)
        private
    {
        _takeNonce(by, nonce);
        _spend(by, nonce, safe, hatId, to, amount);
    }

    function _takeNonce(address by, uint256 nonce) internal {
        uint256 expected = nonces[by];
        if (nonce != expected) revert InvalidNonce(expected, nonce);
        nonces[by] = expected + 1;
    }

    function _spend(address by, uint256 nonce, address safe, uint256 hatId, address to, uint128 amount)
        internal
        virtual;
}
