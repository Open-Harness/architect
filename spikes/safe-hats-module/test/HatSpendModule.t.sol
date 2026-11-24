// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {HatFixture} from "./HatFixture.sol";
import {HatSpendModule} from "../src/HatSpendModule.sol";

contract HatSpendModuleTest is HatFixture {
    HatSpendModule private module;

    function setUp() public override {
        super.setUp();
        module = new HatSpendModule(safe, hats, personHat, address(token));
    }

    function testWearerSpendsEtherAndTokenFromSafe() public {
        enable(address(module));
        vm.startPrank(ada);
        module.spend(address(0), recipient, 1 ether);
        module.spend(address(token), recipient, 2 ether);
        vm.stopPrank();
        assertEq(recipient.balance, 1 ether);
        assertEq(address(safe).balance, 9 ether);
        assertEq(token.balanceOf(recipient), 2 ether);
        assertEq(token.balanceOf(address(safe)), 98 ether);
        assertEq(address(module).balance, 0);
        assertEq(token.balanceOf(address(module)), 0);
    }

    function testNonWearerIsRefused() public {
        enable(address(module));
        _refused(outsider);
    }

    function testInactiveHatIsRefused() public {
        enable(address(module));
        assertTrue(hats.setHatStatus(personHat, false));
        _refused(ada);
    }

    function testIneligibleWearerIsRefused() public {
        enable(address(module));
        assertTrue(hats.setHatWearerStatus(personHat, ada, false, false));
        assertFalse(hats.isEligible(ada, personHat));
        _refused(ada);
    }

    function testDisabledModuleCannotPay() public {
        assertFalse(safe.isModuleEnabled(address(module)));
        vm.prank(ada);
        vm.expectRevert(abi.encodeWithSignature("Error(string)", "GS104"));
        module.spend(address(0), recipient, 1 ether);
        assertEq(recipient.balance, 0);
        assertEq(address(safe).balance, 10 ether);
    }

    function _refused(address who) private {
        vm.prank(who);
        vm.expectRevert(abi.encodeWithSelector(HatSpendModule.NotHatWearer.selector, who, personHat));
        module.spend(address(0), recipient, 1 ether);
        assertEq(recipient.balance, 0);
    }
}
