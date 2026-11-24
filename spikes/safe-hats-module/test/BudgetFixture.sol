// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Safe} from "safe/Safe.sol";
import {HatBudgetModule} from "../src/HatBudgetModule.sol";
import {HatFixture} from "./HatFixture.sol";
import {HatAdminToggle} from "./HatAdminToggle.sol";

abstract contract BudgetFixture is HatFixture {
    uint64 internal constant PERIOD = 3600;
    uint128 internal constant PERSON_LIMIT = 100;
    uint128 internal constant AGENT_LIMIT = 20;

    HatBudgetModule internal budgetModule;
    address internal agent;
    uint256 internal agentHat;
    HatAdminToggle internal toggle;

    function setUp() public virtual override {
        super.setUp();
        vm.warp(10 * PERIOD);
        agent = makeAddr("agent");
        toggle = new HatAdminToggle(hats);
        vm.startPrank(ada);
        agentHat = hats.createHat(personHat, "Agent", 1, ada, address(toggle), true, "");
        assertTrue(hats.mintHat(agentHat, agent));
        vm.stopPrank();
    }

    function setupBudgets(HatBudgetModule module) internal {
        budgetModule = module;
        enable(address(module));
        createBudget(safe, personHat, address(token), PERSON_LIMIT);
        createBudget(safe, agentHat, address(token), AGENT_LIMIT);
    }

    function createBudget(Safe account, uint256 hatId, address asset, uint128 limit) internal {
        safeCall(account, address(budgetModule), abi.encodeCall(
            budgetModule.createBudget, (address(account), hatId, asset, limit, PERIOD, budgetModule.nonces(address(account)))
        ));
    }

    function setLimit(uint256 hatId, uint128 limit) internal {
        safeCall(address(budgetModule), abi.encodeCall(
            budgetModule.setLimit, (address(safe), hatId, limit, budgetModule.nonces(address(safe)))
        ));
    }
}
