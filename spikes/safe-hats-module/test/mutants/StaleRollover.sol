// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IHats} from "hats/Interfaces/IHats.sol";
import {HatBudgetModule} from "../../src/HatBudgetModule.sol";

contract StaleRollover is HatBudgetModule {
    constructor(IHats hats_) HatBudgetModule(hats_) {}

    function _rollover(Budget storage budget) internal override {
        uint256 period = block.timestamp / budget.periodSeconds;
        if (period != budget.period) {
            budget.period = period;
            // Deliberately carry the previous period's spend into the new one.
        }
    }
}
