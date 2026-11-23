// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IHats} from "hats/Interfaces/IHats.sol";
import {Safe} from "safe/Safe.sol";
import {SafePayment} from "./SafePayment.sol";

contract HatSpendModule is SafePayment {
    error NotHatWearer(address caller, uint256 hatId);
    error UnsupportedToken(address token);

    Safe public immutable safe;
    IHats public immutable hats;
    uint256 public immutable hatId;
    address public immutable token;

    constructor(Safe safe_, IHats hats_, uint256 hatId_, address token_) {
        safe = safe_;
        hats = hats_;
        hatId = hatId_;
        token = token_;
    }

    function spend(address asset, address to, uint256 amount) external {
        if (!hats.isWearerOfHat(msg.sender, hatId)) revert NotHatWearer(msg.sender, hatId);
        if (asset != address(0) && asset != token) revert UnsupportedToken(asset);
        _pay(safe, asset, to, amount);
    }
}
