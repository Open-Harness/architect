// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Safe} from "safe/Safe.sol";
import {HatBudgetModule} from "../src/HatBudgetModule.sol";
import {BudgetAuthorization} from "../src/BudgetAuthorization.sol";
import {SafePayment} from "../src/SafePayment.sol";
import {BudgetFixture} from "./BudgetFixture.sol";
import {HatAdminToggle} from "./HatAdminToggle.sol";
import {SixDecimalToken} from "./SafeFixtures.sol";

contract HatBudgetModuleTest is BudgetFixture {
    function setUp() public override {
        super.setUp();
        setupBudgets(new HatBudgetModule(hats));
    }

    function testPersonSpendsExactRemainingAndOverspendIsAtomic() public {
        uint256 initial = token.balanceOf(address(safe));
        vm.expectEmit(true, true, true, true, address(budgetModule));
        emit HatBudgetModule.BudgetSpent(ada, 0, address(safe), personHat, address(token), recipient, 10, 60, 40);
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 60, 0);

        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetExceeded.selector, personHat, 41, 40));
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 41, 1);
        assertEq(budgetModule.nonces(ada), 1);
        assertEq(token.balanceOf(address(safe)), initial - 60);
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 40, 1);
        assertEq(token.balanceOf(address(safe)), initial - 100);
        assertEq(token.balanceOf(recipient), 100);
        assertEq(token.balanceOf(address(budgetModule)), 0);
    }

    function testRolloverRestoresFullBudgetAtExactBoundary() public {
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, PERSON_LIMIT, 0);
        vm.warp(11 * PERIOD - 1);
        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetExceeded.selector, personHat, 1, 0));
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 1, 1);
        vm.warp(11 * PERIOD);
        (HatBudgetModule.Budget memory fresh, uint128 remaining) = budgetModule.budgetOf(address(safe), personHat);
        assertEq(fresh.period, 11);
        assertEq(fresh.spent, 0);
        assertEq(remaining, PERSON_LIMIT);
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, PERSON_LIMIT, 1);
        assertEq(token.balanceOf(recipient), 2 * PERSON_LIMIT);
    }

    function testAgentQuotaAndParentAdmitsOrTurnsOffChild() public {
        assertTrue(hats.isAdminOfHat(ada, agentHat));
        assertFalse(hats.isWearerOfHat(agent, personHat));
        vm.prank(agent);
        budgetModule.spend(address(safe), agentHat, recipient, 12, 0);

        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetExceeded.selector, agentHat, 9, 8));
        vm.prank(agent);
        budgetModule.spend(address(safe), agentHat, recipient, 9, 1);
        (, uint128 personRemaining) = budgetModule.budgetOf(address(safe), personHat);
        assertEq(personRemaining, PERSON_LIMIT);

        vm.expectRevert(abi.encodeWithSelector(HatAdminToggle.NotHatAdmin.selector, agent, agentHat));
        vm.prank(agent);
        toggle.setStatus(agentHat, false);
        vm.prank(ada);
        toggle.setStatus(agentHat, false);
        assertFalse(hats.isWearerOfHat(agent, agentHat));
        vm.expectRevert(BudgetAuthorization.NotAllowed.selector);
        vm.prank(agent);
        budgetModule.spend(address(safe), agentHat, recipient, 1, 1);
        assertEq(token.balanceOf(recipient), 12);
    }

    function testOnlySafeCanAdministerAndRevokedRowCannotBeReused() public {
        uint256 nonce = budgetModule.nonces(address(safe));
        vm.startPrank(ada);
        vm.expectRevert(BudgetAuthorization.NotAllowed.selector);
        budgetModule.createBudget(address(safe), 7, address(token), 1, PERIOD, nonce);
        vm.expectRevert(BudgetAuthorization.NotAllowed.selector);
        budgetModule.setLimit(address(safe), personHat, 1, nonce);
        vm.expectRevert(BudgetAuthorization.NotAllowed.selector);
        budgetModule.revokeBudget(address(safe), personHat, nonce);
        vm.stopPrank();

        setLimit(personHat, 90);
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 60, 0);
        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.LimitBelowSpent.selector, 59, 60));
        vm.prank(address(safe));
        budgetModule.setLimit(address(safe), personHat, 59, nonce + 1);
        (, uint128 remaining) = budgetModule.budgetOf(address(safe), personHat);
        assertEq(remaining, 30);

        safeCall(address(budgetModule), abi.encodeCall(budgetModule.revokeBudget, (address(safe), personHat, nonce + 1)));
        (HatBudgetModule.Budget memory revoked, uint128 afterRevoke) = budgetModule.budgetOf(address(safe), personHat);
        assertTrue(revoked.revoked);
        assertEq(afterRevoke, 0);
        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetNotFound.selector, address(safe), personHat));
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 1, 1);
        vm.expectRevert(
            abi.encodeWithSelector(HatBudgetModule.AlreadyExists.selector, keccak256(abi.encode(address(safe), personHat)))
        );
        vm.prank(address(safe));
        budgetModule.createBudget(address(safe), personHat, address(token), 200, PERIOD, nonce + 2);
    }

    function testSameHatHasSeparateRowsForSixAndEighteenDecimalTokens() public {
        Safe other = newSafe(2);
        safeCall(other, address(other), abi.encodeCall(other.enableModule, (address(budgetModule))));
        SixDecimalToken six = new SixDecimalToken();
        six.mint(address(other), 1_500_000);
        createBudget(other, personHat, address(six), 1_500_000);
        setLimit(personHat, 1_500_000_000_000_000_000);
        assertEq(six.decimals(), 6);
        assertEq(token.decimals(), 18);

        vm.startPrank(ada);
        budgetModule.spend(address(other), personHat, recipient, 1_250_001, 0);
        budgetModule.spend(address(safe), personHat, recipient, 1_250_000_000_000_000_001, 1);
        vm.stopPrank();
        (HatBudgetModule.Budget memory sixRow, uint128 sixRemaining) = budgetModule.budgetOf(address(other), personHat);
        (HatBudgetModule.Budget memory tokenRow, uint128 tokenRemaining) = budgetModule.budgetOf(address(safe), personHat);
        assertEq(sixRow.token, address(six));
        assertEq(tokenRow.token, address(token));
        assertEq(sixRemaining, 249_999);
        assertEq(tokenRemaining, 249_999_999_999_999_999);
        assertEq(six.balanceOf(recipient), 1_250_001);
        assertEq(token.balanceOf(recipient), 1_250_000_000_000_000_001);
    }

    function testUint128MaximumTransfersWithoutOverflow() public {
        uint128 max = type(uint128).max;
        token.mint(address(safe), max);
        setLimit(personHat, max);
        uint256 initial = token.balanceOf(address(safe));
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, max, 0);
        assertEq(token.balanceOf(recipient), max);
        assertEq(token.balanceOf(address(safe)), initial - max);
        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetExceeded.selector, personHat, 1, 0));
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 1, 1);
    }

    function testTokenRevertRestoresBudgetAndNonce() public {
        setLimit(personHat, type(uint128).max);
        vm.expectPartialRevert(SafePayment.PaymentReverted.selector);
        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, type(uint128).max, 0);
        (, uint128 remaining) = budgetModule.budgetOf(address(safe), personHat);
        assertEq(remaining, type(uint128).max);
        assertEq(budgetModule.nonces(ada), 0);
        assertEq(token.balanceOf(recipient), 0);
    }

    function testSignatureCheckOrderAndSharedSpendNonce() public {
        uint256 deadline = block.timestamp + 60;
        bytes memory signature = signSpend(personHat, 1, 0, deadline);
        vm.expectRevert(abi.encodeWithSelector(BudgetAuthorization.SignatureExpired.selector, block.timestamp - 1));
        budgetModule.spendBySig(address(safe), personHat, recipient, 1, ada, 9, block.timestamp - 1, "");

        vm.expectRevert(BudgetAuthorization.BadSignature.selector);
        budgetModule.spendBySig(address(safe), personHat, recipient, 1, ada, 9, deadline, signature);

        vm.prank(outsider);
        budgetModule.spendBySig(address(safe), personHat, recipient, 1, ada, 0, deadline, signature);
        vm.expectRevert(abi.encodeWithSelector(BudgetAuthorization.InvalidNonce.selector, 1, 0));
        budgetModule.spendBySig(address(safe), personHat, recipient, 1, ada, 0, deadline, signature);

        vm.prank(ada);
        budgetModule.spend(address(safe), personHat, recipient, 1, 1);
        vm.expectRevert(abi.encodeWithSelector(BudgetAuthorization.InvalidNonce.selector, 2, 1));
        vm.prank(ada);
        budgetModule.spend(address(safe), 7, recipient, 1, 1);

        vm.expectRevert(abi.encodeWithSelector(HatBudgetModule.BudgetNotFound.selector, address(safe), 7));
        vm.prank(outsider);
        budgetModule.spend(address(safe), 7, recipient, 1, 0);
        assertEq(token.balanceOf(recipient), 2);
    }

    function signSpend(uint256 hatId, uint128 amount, uint256 nonce, uint256 deadline) private view returns (bytes memory) {
        bytes32 domain = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("Budgets"), keccak256("1"), block.chainid, address(budgetModule)
        ));
        bytes32 message = keccak256(abi.encode(
            keccak256("BudgetSpend(address safe,uint256 hatId,address to,uint128 amount,address signer,uint256 nonce,uint256 deadline)"),
            address(safe), hatId, recipient, amount, ada, nonce, deadline
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(adaKey, keccak256(abi.encodePacked("\x19\x01", domain, message)));
        return abi.encodePacked(r, s, v);
    }
}
