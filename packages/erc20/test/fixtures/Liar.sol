// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// The erc20 checks' liar (#1162): an ERC-20's shape whose answers never follow from the request. It reads 77 for every
/// balance and 9 decimals, emits no event, takes a transfer to the zero address, and refuses with fields of its own: so
/// an adapter that works out a balance, a refusal's fields or a refusal itself from the request, or types a revert by its
/// length, is caught. Written by the checks author.
contract Liar {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidReceiver(address receiver);
    /// The same shape as ERC20InsufficientBalance, another selector: an adapter must leave it the port's error.
    error Short(address who, uint256 have, uint256 want);

    function balanceOf(address) external pure returns (uint256) { return 77; }
    function decimals() external pure returns (uint8) { return 9; }

    function transfer(address, uint256 value) external pure returns (bool) {
        if (value == 1) revert ERC20InsufficientBalance(address(0xdEaD), 42, 43);
        if (value == 2) revert Short(address(0xBEEF), 1, 2);
        if (value == 3) revert ERC20InvalidReceiver(address(0xCAFE));
        return true;
    }
}
