// Throwaway. A spike for the manual's chapter 2: one question from the plan page for "pay by name"
// (docs/manual/captures/plan-page.txt): can a late reversal be mirrored without a balance going below zero?
// It plays one wallet's events in every order they can happen, under each way of mirroring a late reversal, and counts
// the orders in which a rule of the page breaks. Plain Node, no dependencies, nothing imported by any package.
//   node spikes/pay-by-name-reversal/spike.mjs

// One wallet. Two payments come in and clear, the holder withdraws twice, and the provider reverses payment A and
// sends that notice twice. A withdrawal is refused when the balance cannot cover it.
const events = [
  { id: "payA", say: "pay A 50", kind: "pay", payment: "A", amount: 50 },
  { id: "clearA", say: "A clears", kind: "clear", payment: "A", after: ["payA"] },
  { id: "payB", say: "pay B 30", kind: "pay", payment: "B", amount: 30 },
  { id: "clearB", say: "B clears", kind: "clear", payment: "B", after: ["payB"] },
  { id: "w40", say: "withdraw 40", kind: "withdraw", amount: 40 },
  { id: "w30", say: "withdraw 30", kind: "withdraw", amount: 30 },
  { id: "rev", say: "the provider reverses A", kind: "reverse", payment: "A", after: ["payA"] },
  { id: "again", say: "the notice comes again", kind: "reverse", payment: "A", after: ["rev"] },
];

/** Every order of the events in which each comes after the ones it needs. */
function orders(left = events, done = []) {
  if (left.length === 0) return [done];
  return left
    .filter((e) => (e.after ?? []).every((id) => done.some((d) => d.id === id)))
    .flatMap((e) => orders(left.filter((x) => x !== e), [...done, e]));
}

// The ways to mirror a reversal that arrives after its payment cleared. Each is given the wallet and the amount.
const ways = {
  "mirror it at once": (w, amount) => { w.balance -= amount; w.returned += amount; },
  "refuse to mirror it": () => {},
  "take what is there, and write the rest down as a shortfall": (w, amount) => {
    const taken = Math.min(w.balance, amount);
    w.balance -= taken; w.shortfall += amount - taken; w.returned += amount;
  },
};

/** Plays one order under one way, and returns which rules broke and where. */
function play(order, mirror) {
  const w = { balance: 0, held: 0, settledIn: 0, withdrawn: 0, returned: 0, shortfall: 0, provider: 0 };
  const payments = {}, broke = {}, steps = [];
  let late = false, providerBelowZero = false, worstShortfall = 0;
  for (const e of order) {
    const p = e.payment && payments[e.payment];
    if (e.kind === "pay") { payments[e.payment] = { amount: e.amount, state: "held" }; w.held += e.amount; w.provider += e.amount; }
    if (e.kind === "clear" && p.state === "held") {
      // A payment that clears pays an open shortfall first.
      const repaid = Math.min(w.shortfall, p.amount);
      p.state = "settled"; w.held -= p.amount; w.settledIn += p.amount; w.shortfall -= repaid; w.balance += p.amount - repaid;
    }
    // A wallet with a shortfall is frozen: nothing leaves it.
    if (e.kind === "withdraw" && w.shortfall === 0 && w.balance >= e.amount) { w.balance -= e.amount; w.withdrawn += e.amount; w.provider -= e.amount; }
    if (e.kind === "reverse" && p.state === "held") { p.state = "returned"; w.held -= p.amount; w.provider -= p.amount; }
    else if (e.kind === "reverse" && p.state === "settled") {
      // The late one. The provider has taken the money back whatever the app does. A repeated notice finds the
      // payment already returned and does nothing, except under "refuse", where the app never marked it.
      if (!p.providerTookIt) { p.providerTookIt = true; w.provider -= p.amount; late = true; }
      if (mirror !== ways["refuse to mirror it"]) p.state = "returned";
      mirror(w, p.amount);
    }
    steps.push(`${e.say} → ${w.balance}`);
    providerBelowZero ||= w.provider < 0;
    worstShortfall = Math.max(worstShortfall, w.shortfall);
    const rules = {
      "a balance never goes below zero": w.balance >= 0,
      "a balance is exactly the settled payments in, minus the withdrawals and returns out": w.balance === w.settledIn - w.withdrawn - w.returned,
      "the app's balance and the money the provider really holds agree": w.balance + w.held === w.provider,
      "the same two rules, with the shortfall counted": w.balance === w.settledIn - w.withdrawn - w.returned + w.shortfall && w.balance + w.held - w.shortfall === w.provider,
    };
    for (const [rule, kept] of Object.entries(rules)) if (!kept) broke[rule] ??= steps.join(", ");
  }
  return { broke, late, providerBelowZero, worstShortfall, owedAtEnd: w.shortfall };
}

const all = orders();
const facts = all.map((order) => play(order, ways["mirror it at once"]));
const lateOnes = all.filter((_, k) => facts[k].late);
console.log("question: can a late reversal be mirrored without a balance going below zero?");
console.log(`played: ${events.length} events on one wallet, in every order they can happen: ${all.length} orders`);
console.log(`  ${events.map((e) => e.say).join(" · ")}`);
const early = all.filter((_, k) => !facts[k].late);
const earlyBroken = early.filter((order) => Object.values(ways).some((mirror) => Object.keys(play(order, mirror).broke).length > 0));
console.log(`in ${early.length} orders the reversal comes before A clears: ${earlyBroken.length === 0 ? "every rule is kept, whatever the app does" : `a rule breaks in ${earlyBroken.length}`}`);
console.log(`in ${lateOnes.length} orders the reversal is late: A had already cleared`);
const short = facts.filter((f) => f.broke["a balance never goes below zero"]);
console.log(`in ${short.length} of those the holder had already withdrawn, and what is left cannot cover it`);
console.log(`in ${short.filter((f) => f.providerBelowZero).length} of those ${short.length} the provider's own figure for the whole wallet goes below zero too`);

for (const [name, mirror] of Object.entries(ways)) {
  const runs = lateOnes.map((order) => play(order, mirror));
  console.log(`\n${name}`);
  const asked = Object.keys(runs.flatMap((r) => Object.keys(r.broke)).reduce((seen, rule) => ({ ...seen, [rule]: true }), {}));
  for (const rule of ["a balance never goes below zero", "a balance is exactly the settled payments in, minus the withdrawals and returns out", "the app's balance and the money the provider really holds agree"]) {
    const broken = runs.filter((r) => r.broke[rule]);
    if (broken.length === 0) { console.log(`  kept in all ${runs.length}: ${rule}`); continue; }
    // The example is the broken order that says it in the fewest steps.
    const example = broken.map((r) => r.broke[rule]).sort((a, b) => a.split(", ").length - b.split(", ").length || (a < b ? -1 : 1))[0];
    console.log(`  broken in ${broken.length} of ${runs.length}: ${rule}`);
    console.log(`    for example: ${example}`);
  }
  if (name.includes("shortfall")) {
    const extra = "the same two rules, with the shortfall counted";
    console.log(`  ${asked.includes(extra) ? "broken" : `kept in all ${runs.length}`}: ${extra}`);
    console.log(`  the shortfall: in ${runs.filter((r) => r.worstShortfall > 0).length} orders, ${Math.max(...runs.map((r) => r.worstShortfall))} at most, and still owed at the end in ${runs.filter((r) => r.owedAtEnd > 0).length}`);
  }
}

const twice = all.every((order) => { const once = order.filter((e) => e.id !== "again"); return ["mirror it at once", "take what is there, and write the rest down as a shortfall"].every((n) => JSON.stringify(play(order, ways[n]).broke) === JSON.stringify(play(once, ways[n]).broke)); });
console.log(`\nthe notice coming twice: ${twice ? "changed nothing in any order, once the payment is marked returned" : "changed the result in some order"}`);
