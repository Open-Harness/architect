// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

interface IToken { function transfer(address to, uint256 value) external returns (bool); }

/// A stand-in for a payments router whose send takes one tuple, the shape CX-bridge-rails' Org Budget scopes (V3 send's
/// PaymentItem): an id, a recipient, a token and an amount. It pays from its own balance; Roles judges only the calldata.
contract PaymentsStandIn {
    struct Item { bytes32 settlementId; address recipient; address token; uint256 amount; }
    event Paid(bytes32 settlementId, address recipient, address token, uint256 amount);
    function send(Item calldata item) external {
        require(IToken(item.token).transfer(item.recipient, item.amount));
        emit Paid(item.settlementId, item.recipient, item.token, item.amount);
    }
}
