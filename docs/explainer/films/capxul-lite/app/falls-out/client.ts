// What a client does with it. The same lines run in the app, the CLI and an agent's tool.
const spend = await sdk.spend.draft({ budget, to, amount, reason });

const pay = spend.next;          // budget.spend, already filled in
await pay.simulate();            // refused here, for free: BudgetExceeded
await pay.sign(wallet);          // the wallet shows the operation's description
for await (const at of pay.follow()) {
  // "sent", then "paid" once the chain will keep it
}
