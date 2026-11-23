// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Enum} from "safe/libraries/Enum.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Safe} from "safe/Safe.sol";
import {SafePayment} from "../src/SafePayment.sol";
import {BudgetAuthorization} from "../src/BudgetAuthorization.sol";

contract TestToken is ERC20("Spike token", "SPIKE") {
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SixDecimalToken is TestToken {
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function symbol() public pure override returns (string memory) {
        return "SPIKE6";
    }
}

contract FalseToken {
    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}

contract RevertingToken {
    error TransferRefused();

    function transfer(address, uint256) external pure returns (bool) {
        revert TransferRefused();
    }
}

contract SafeRouteProbe is BudgetAuthorization, SafePayment {
    event Paid(address indexed by, uint256 nonce, address indexed to, uint128 amount);

    event CallResult(bool success);

    Safe public immutable safe;
    address public immutable token;

    constructor(Safe safe_, address token_) {
        safe = safe_;
        token = token_;
    }

    function probeCall(address to, uint256 amount) external {
        if (msg.sender != address(safe)) revert NotAllowed();
        bool success = safe.execTransactionFromModule(
            token, 0, abi.encodeCall(IERC20.transfer, (to, amount)), Enum.Operation.Call
        );
        emit CallResult(success);
    }

    function _spend(address by, uint256 nonce, address from, uint256, address to, uint128 amount)
        internal
        override
    {
        if (by != address(safe) || from != address(safe)) revert NotAllowed();
        _pay(safe, token, to, amount);
        emit Paid(by, nonce, to, amount);
    }
}
