// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Test fixture for the ERC20 transfer surface.
contract AnvilToken {
    error InsufficientBalance(uint256 available, uint256 requested);
    event Transfer(address indexed from, address indexed to, uint256 value);
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = 100;
        emit Transfer(address(0), msg.sender, 100);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 available = balanceOf[msg.sender];
        if (available < value) revert InsufficientBalance(available, value);
        balanceOf[msg.sender] = available - value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function refuseEmpty() external pure {
        revert();
    }
}
