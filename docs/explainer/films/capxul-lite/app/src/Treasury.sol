// Scaffolded from blueprint/things/budget/verbs/spend.ts. Yours from now on.
contract Treasury is TreasuryBase {
  function _spend(Budget storage budget, uint128 amount, address to)
    internal override returns (BudgetState) {
    budget.spent += amount;
    _pay(to, amount);
    bool done = budget.spent == budget.limit;
    return done ? BudgetState.Exhausted : BudgetState.Active;
  }
}
