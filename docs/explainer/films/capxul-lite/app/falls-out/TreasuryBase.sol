// Generated from blueprint/stores/treasury.ts. Do not edit.
abstract contract TreasuryBase is IAccessControl {
  error BudgetExceeded(uint128 remaining);   // BU-001
  event BudgetSpent(bytes32 budget, uint128 amount, address to, bytes32 note);

  function spend(bytes32 budget, uint128 amount, address to, bytes32 note, uint256 nonce) external {
    _spend_(msg.sender, nonce, budget, amount, to, note);
  }
  function spendBySig(/* the same, with a signer, a deadline and a signature */) external { … }

  function _spend_(address by, uint256 nonce, bytes32 id, uint128 amount, address to, bytes32 note) private {
    Budget storage budget = _budget(id);                        // the row is there
    if (!hasRole(holderOf(id), by)) revert NotAllowed();        // allowed: [holder]
    if (budget.state != BudgetState.Active) revert BudgetNotActive(budget.state);   // the machine
    budget.state = _spend(budget, amount, to, note);            // your handler
    if (budget.spent > budget.limit) revert BudgetExceeded(0);  // the rule, before the commit
    emit BudgetSpent(id, amount, to, note);                     // the event
  }
}
