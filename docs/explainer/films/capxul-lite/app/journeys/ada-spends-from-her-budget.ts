// Journey-author file. The builder of budget.spend never edits it.
export default Blueprint.journey("ada spends from her budget", {
  cast: { ada: holder, bob: owner, carol: owner },
  starts: "granted",
  steps: (s) => [
    s.step(
      "ada pays a supplier, and says why",
      s.ada.run(spend, { budget: s.world.budget, to: s.world.supplier, amount: 400n, reason: "Design work, March" }),
      emits(BudgetSpent, { amount: 400n }),
      receipts({ sent: 1, reverted: 0, transfers: [{ to: s.world.supplier, amount: 400n }] }),
      recorded(Spend, { amount: 400n, reason: "Design work, March" }).isIn("paid"),
    ),
    s.step(
      "over the limit is refused, and nothing is sent",
      s.ada.run(spend, { budget: s.world.budget, to: s.world.supplier, amount: 700n, reason: "Too much" }),
      refuses(BudgetExceeded),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "a month passes, and she can spend again",
      s.clock.advance("1 month"),
      budgets.isIn(s.world.budget, "active"),
    ),
    s.step(
      "she pays around the app, and the books ask why",
      s.ada.wallet.call(s.world.treasury, "spend", { budget: s.world.budget, to: s.world.supplier, amount: 150n }),
      receipts({ sent: 1, reverted: 0 }),
      recorded(Spend, { amount: 150n }).isIn("unexplained"),
    ),
  ],
});
