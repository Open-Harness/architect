// The SDK. The same call from the app, a script, or an agent's tool.
const call = sdk.budget.spend({ budget, to, amount: 400n, reason: "Design work, March" });

await call.try();            // free. Refused here: BudgetExceeded
await call.sign(wallet);     // one signature: the money, and the reason's seal
for await (const at of call.follow()) {
  // "submitted", then "confirmed" once the chain will keep it
}
