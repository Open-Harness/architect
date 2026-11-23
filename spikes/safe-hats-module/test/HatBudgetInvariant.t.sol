// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {HatBudgetModule} from "../src/HatBudgetModule.sol";
import {BudgetFixture} from "./BudgetFixture.sol";
import {TestToken} from "./SafeFixtures.sol";
import {StaleRollover} from "./mutants/StaleRollover.sol";

contract BudgetActions is Test {
    struct Row {
        uint256 hat;
        address wearer;
        uint128 limit;
        uint256 nonce;
    }

    error InBudgetSpendRefused(uint256 hat, uint128 amount, uint128 remaining);

    uint128 private constant MAX_LIMIT = 300;
    HatBudgetInvariantTest private immutable fixture;
    HatBudgetModule private immutable module;
    TestToken private immutable token;
    address private immutable safe;
    address private immutable recipient;
    uint64 private immutable periodSeconds;
    uint256 private immutable initialBalance;
    uint256 private immutable initialRecipientBalance;

    Row[2] private rows;
    mapping(uint256 hat => mapping(uint256 period => uint128 amount)) private spent;
    uint256 private totalPaid;

    constructor(
        HatBudgetModule module_, TestToken token_, address safe_, address recipient_, uint64 periodSeconds_,
        Row[2] memory rows_
    ) {
        fixture = HatBudgetInvariantTest(msg.sender);
        module = module_;
        token = token_;
        safe = safe_;
        recipient = recipient_;
        periodSeconds = periodSeconds_;
        initialBalance = token_.balanceOf(safe_);
        initialRecipientBalance = token_.balanceOf(recipient_);
        rows[0] = rows_[0];
        rows[1] = rows_[1];
    }

    function spend(bool child, uint128 sample, uint8 mode) external {
        Row storage row = rows[child ? 1 : 0];
        uint256 period = block.timestamp / periodSeconds;
        uint128 remaining = row.limit - spent[row.hat][period];
        uint128 amount = sample % (MAX_LIMIT + 2);
        if (mode % 3 == 1) amount = remaining;
        if (mode % 3 == 2) amount = remaining + 1;

        bytes memory data = abi.encodeCall(module.spend, (safe, row.hat, recipient, amount, row.nonce));
        vm.prank(row.wearer);
        (bool success, bytes memory result) = address(module).call(data);
        if (amount > remaining) {
            assertFalse(success, "over-budget spend paid");
            assertEq(result, abi.encodeWithSelector(HatBudgetModule.BudgetExceeded.selector, row.hat, amount, remaining));
            return;
        }
        if (!success) revert InBudgetSpendRefused(row.hat, amount, remaining);

        spent[row.hat][period] += amount;
        totalPaid += amount;
        ++row.nonce;
    }

    function advance(uint64 elapsed) external {
        vm.warp(block.timestamp + 1 + elapsed % (2 * periodSeconds));
    }

    function changeLimit(bool child, uint128 sample) external {
        Row storage row = rows[child ? 1 : 0];
        uint128 used = spent[row.hat][block.timestamp / periodSeconds];
        uint128 limit = used + sample % (MAX_LIMIT - used + 1);
        fixture.setLimitFromHandler(row.hat, limit);
        row.limit = limit;
    }

    function check() external view {
        uint256 period = block.timestamp / periodSeconds;
        for (uint256 i; i < rows.length; ++i) {
            Row memory row = rows[i];
            uint128 used = spent[row.hat][period];
            (HatBudgetModule.Budget memory actual, uint128 remaining) = module.budgetOf(safe, row.hat);
            assertLe(used, row.limit, "period cap");
            assertEq(actual.period, period, "period");
            assertEq(actual.limit, row.limit, "limit");
            assertEq(actual.spent, used, "period spend");
            assertEq(remaining, row.limit - used, "period remaining");
            assertEq(module.nonces(row.wearer), row.nonce, "wearer nonce");
        }
        assertEq(token.balanceOf(safe), initialBalance - totalPaid, "Safe balance");
        assertEq(token.balanceOf(recipient), initialRecipientBalance + totalPaid, "recipient balance");
    }
}

contract HatBudgetInvariantTest is BudgetFixture {
    BudgetActions private actions;

    function setUp() public override {
        super.setUp();
        HatBudgetModule module = vm.envOr("HAT_BUDGET_MUTANT", false)
            ? new StaleRollover(hats)
            : new HatBudgetModule(hats);
        setupBudgets(module);
        BudgetActions.Row[2] memory rows = [
            BudgetActions.Row(personHat, ada, PERSON_LIMIT, 0),
            BudgetActions.Row(agentHat, agent, AGENT_LIMIT, 0)
        ];
        actions = new BudgetActions(module, token, address(safe), recipient, PERIOD, rows);
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = actions.spend.selector;
        selectors[1] = actions.advance.selector;
        selectors[2] = actions.changeLimit.selector;
        targetContract(address(actions));
        targetSelector(FuzzSelector(address(actions), selectors));
    }

    function setLimitFromHandler(uint256 hat, uint128 limit) external {
        assertEq(msg.sender, address(actions));
        setLimit(hat, limit);
    }

    function invariant_budgetAccounting() external view {
        actions.check();
    }
}
