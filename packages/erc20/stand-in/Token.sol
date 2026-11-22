// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// The stand-in for the `erc20` adapter: OpenZeppelin's ERC-20 (its ERC-6093 errors included). The test mint is the
/// constructor's: the whole supply goes to the account that deploys it, and it hands tokens on with `transfer`.
contract Token is ERC20 {
    constructor() ERC20("Test Token", "TST") {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}
