// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IHats} from "hats/Interfaces/IHats.sol";

contract HatAdminToggle {
    error NotHatAdmin(address caller, uint256 hatId);

    IHats public immutable hats;

    constructor(IHats hats_) {
        hats = hats_;
    }

    function setStatus(uint256 hatId, bool active) external {
        if (!hats.isAdminOfHat(msg.sender, hatId)) revert NotHatAdmin(msg.sender, hatId);
        hats.setHatStatus(hatId, active);
    }
}
