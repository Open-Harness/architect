// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

error Nope();

/// A fixture that disagrees with the `erc20` adapter's ABI in four planted ways, so conformance has something to name:
/// it has no `approve` and no `decimals`; `transfer` of exactly 1 reverts with `Nope()`, an error the ABI does not declare;
/// and since no `approve` exists, `Approval` is never emitted. Everything else behaves as an ERC-20 does.
contract Broken {
    event Transfer(address indexed from, address indexed to, uint256 value);

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply = 1_000_000;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function name() external pure returns (string memory) {
        return "Broken";
    }

    function symbol() external pure returns (string memory) {
        return "BRK";
    }

    function transfer(address to, uint256 value) external returns (bool) {
        if (value == 1) revert Nope();
        _move(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert IERC20Errors.ERC20InsufficientAllowance(msg.sender, allowed, value);
        allowance[from][msg.sender] = allowed - value;
        _move(from, to, value);
        return true;
    }

    function _move(address from, address to, uint256 value) private {
        uint256 held = balanceOf[from];
        if (held < value) revert IERC20Errors.ERC20InsufficientBalance(from, held, value);
        balanceOf[from] = held - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
