// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IHats} from "hats/Interfaces/IHats.sol";
import {Safe} from "safe/Safe.sol";
import {BudgetAuthorization} from "./BudgetAuthorization.sol";
import {SafePayment} from "./SafePayment.sol";

contract HatBudgetModule is BudgetAuthorization, SafePayment {
    struct Budget {
        address token;
        uint64 periodSeconds;
        bool revoked;
        uint128 limit;
        uint128 spent;
        uint256 period;
    }

    error AlreadyExists(bytes32 id);
    error BudgetNotFound(address safe, uint256 hatId);
    error InvalidBudget();
    error InvalidRecipient(address recipient);
    error LimitBelowSpent(uint128 limit, uint128 spent);
    error BudgetExceeded(uint256 hatId, uint128 amount, uint128 remaining);

    event BudgetCreated(
        address indexed by, uint256 nonce, uint256 indexed hatId, address token, uint128 limit, uint64 periodSeconds,
        uint256 period
    );
    event BudgetLimitChanged(address indexed by, uint256 nonce, uint256 indexed hatId, uint256 period, uint128 limit);
    event BudgetRevoked(address indexed by, uint256 nonce, uint256 indexed hatId);
    event BudgetSpent(
        address indexed by, uint256 nonce, address indexed safe, uint256 indexed hatId, address token, address to,
        uint256 period, uint128 amount, uint128 remaining
    );

    IHats public immutable hats;
    mapping(address => mapping(uint256 => Budget)) private budgets;

    constructor(IHats hats_) {
        hats = hats_;
    }

    function createBudget(address safe, uint256 hatId, address token, uint128 limit, uint64 periodSeconds, uint256 nonce)
        external
    {
        _authorizeSafe(safe, nonce);
        if (budgets[safe][hatId].periodSeconds != 0) revert AlreadyExists(keccak256(abi.encode(safe, hatId)));
        if (periodSeconds == 0 || token.code.length == 0) revert InvalidBudget();

        uint256 period = block.timestamp / periodSeconds;
        budgets[safe][hatId] = Budget(token, periodSeconds, false, limit, 0, period);
        emit BudgetCreated(safe, nonce, hatId, token, limit, periodSeconds, period);
    }

    function setLimit(address safe, uint256 hatId, uint128 limit, uint256 nonce) external {
        _authorizeSafe(safe, nonce);
        Budget storage budget = _activeBudget(safe, hatId);
        _rollover(budget);
        if (limit < budget.spent) revert LimitBelowSpent(limit, budget.spent);
        budget.limit = limit;
        emit BudgetLimitChanged(safe, nonce, hatId, budget.period, limit);
    }

    function revokeBudget(address safe, uint256 hatId, uint256 nonce) external {
        _authorizeSafe(safe, nonce);
        Budget storage budget = _activeBudget(safe, hatId);
        budget.revoked = true;
        emit BudgetRevoked(safe, nonce, hatId);
    }

    function budgetOf(address safe, uint256 hatId) external view returns (Budget memory budget, uint128 remaining) {
        budget = budgets[safe][hatId];
        if (budget.periodSeconds == 0) revert BudgetNotFound(safe, hatId);
        if (budget.revoked) return (budget, 0);
        uint256 period = block.timestamp / budget.periodSeconds;
        if (period != budget.period) {
            budget.period = period;
            budget.spent = 0;
        }
        return (budget, budget.limit - budget.spent);
    }

    function _spend(address by, uint256 nonce, address safe, uint256 hatId, address to, uint128 amount)
        internal
        override
    {
        Budget storage budget = _activeBudget(safe, hatId);
        if (!hats.isWearerOfHat(by, hatId)) revert NotAllowed();
        if (to == address(0) || to == safe || to == address(this)) revert InvalidRecipient(to);
        _rollover(budget);
        uint128 remaining = budget.limit - budget.spent;
        if (amount > remaining) revert BudgetExceeded(hatId, amount, remaining);
        budget.spent += amount;
        uint256 period = budget.period;
        _pay(Safe(payable(safe)), budget.token, to, amount);
        emit BudgetSpent(by, nonce, safe, hatId, budget.token, to, period, amount, remaining - amount);
    }

    function _authorizeSafe(address safe, uint256 nonce) private {
        if (msg.sender != safe || safe.code.length == 0) revert NotAllowed();
        _takeNonce(safe, nonce);
    }

    function _activeBudget(address safe, uint256 hatId) private view returns (Budget storage budget) {
        budget = budgets[safe][hatId];
        if (budget.periodSeconds == 0 || budget.revoked) revert BudgetNotFound(safe, hatId);
    }

    function _rollover(Budget storage budget) internal virtual {
        uint256 period = block.timestamp / budget.periodSeconds;
        if (period != budget.period) {
            budget.period = period;
            budget.spent = 0;
        }
    }
}
