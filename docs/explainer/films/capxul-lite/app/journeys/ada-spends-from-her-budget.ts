// Journey-author file. The builder of budget.spend and spend.draft never edits it.
export default Blueprint.journey("ada spends from her budget", {
  cast: { ada: holder, bob: owner, carol: owner, visitor: Blueprint.anyone },
  starts: "granted",
  steps: (s) => [
    s.step(
      "ada says what she is paying for, signs, and the treasury pays",
      s.ada.run(draft, { budget: s.world.budget, to: s.world.supplier, amount: 400n, reason: "Design work, March" }),
      s.ada.next(), // new: the step `draft` named
      emits(BudgetSpent, { amount: 400n, note: s.last.spend }),
      receipts({ sent: 1, reverted: 0, transfers: [{ to: s.world.supplier, amount: 400n }] }),
      spends.isIn(s.last.spend, "paid"),
    ),
    s.step(
      "over the limit is refused, and no transaction is sent",
      s.ada.run(draft, { budget: s.world.budget, to: s.world.supplier, amount: 700n, reason: "Too much" }),
      s.ada.next(), // new
      refuses(BudgetExceeded),
      receipts({ sent: 0, reverted: 0 }),
      spends.isIn(s.last.spend, "discarded"),
    ),
    s.step(
      "a month passes on the world's clock, and she can spend again",
      s.clock.advance("1 month"),
      budgets.isIn(s.world.budget, "active"),
    ),
  ],
});
