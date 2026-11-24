// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Safe} from "safe/Safe.sol";
import {Enum} from "safe/libraries/Enum.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract SafePayment {
    error PaymentReverted(bytes reason);
    error TokenRejectedTransfer();

    function _pay(Safe safe, address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            if (!safe.execTransactionFromModule(to, amount, "", Enum.Operation.Call)) {
                revert PaymentReverted("");
            }
            return;
        }

        // A successful EVM CALL can still return false from ERC-20 transfer.
        if (token.code.length == 0) revert TokenRejectedTransfer();
        (bool success, bytes memory data) = safe.execTransactionFromModuleReturnData(
            token, 0, abi.encodeCall(IERC20.transfer, (to, amount)), Enum.Operation.Call
        );
        if (!success) revert PaymentReverted(data);
        if (data.length != 0 && (data.length != 32 || abi.decode(data, (uint256)) != 1)) {
            revert TokenRejectedTransfer();
        }
    }
}
