// The planted journeys of check 01: each case copies one journey of `e2e/fixtures/events/in` with ONE wrong expectation,
// and prove must fail that copy at exactly that step and pass every other (support.ts `failedAt`). A `from` text must be
// in the journey exactly once, and every case's `step` must be a title in it (`01-events-in.test.ts` reads this).
export type Swap = readonly [from: string, to: string];
export interface Case { readonly tag: string; readonly step: string; readonly swaps: ReadonlyArray<Swap> }
export interface Plan { readonly file: string; readonly name: string; readonly steps: number; readonly cases: ReadonlyArray<Case> }

const SETTLED = '{ event: "checkoutCompleted", to: "op:payment.settle", state: "delivered" }';

export const ONCE: Plan = {
  file: "the-bank-settles-once",
  name: "the bank settles a payment once",
  steps: 8,
  cases: [
    { tag: "door-answer", step: "the bank says the checkout completed", swaps: [['toEqual({ accepted: true }),\n      spans({ present: ["in.bank", "in.bank.accepted"]', 'toEqual({ seen: true }),\n      spans({ present: ["in.bank", "in.bank.accepted"]']] },
    { tag: "door-span", step: "the bank says the checkout completed", swaps: [['absent: ["in.bank.refused"]', 'absent: ["in.bank.accepted"]']] },
    { tag: "two-deliveries", step: "the payment settles, called by the bank", swaps: [[`${SETTLED}]),\n      emits`, `${SETTLED}, ${SETTLED}]),\n      emits`]] },
    { tag: "event-intent", step: "the payment settles, called by the bank", swaps: [['emits(PaymentSettled, { payment: s.world.payment, intent: "pi_1" })', 'emits(PaymentSettled, { payment: s.world.payment, intent: "pi_2" })']] },
    { tag: "called-by-system", step: "the payment settles, called by the bank", swaps: [["calledBy(Blueprint.service(bank))", "calledBy(Blueprint.system)"]] },
    { tag: "still-pending", step: "the payment settles, called by the bank", swaps: [['machine.isIn(s.world.payment, "settled")', 'machine.isIn(s.world.payment, "pending")']] },
    { tag: "again-accepted", step: "the bank says it again, with the same event id", swaps: [["toEqual({ seen: true }),", "toEqual({ accepted: true }),"]] },
    { tag: "again-emits", step: "the bank says it again, with the same event id", swaps: [['noEvents(),\n      spans({ present: ["in.bank.seen"]', 'emits(PaymentSettled, { payment: s.world.payment, intent: "pi_1" }),\n      spans({ present: ["in.bank.seen"]']] },
    { tag: "again-span", step: "the bank says it again, with the same event id", swaps: [['present: ["in.bank.seen"], absent: ["in.bank.accepted"]', 'present: ["in.bank.accepted"]']] },
    { tag: "again-settles", step: "nothing more settles", swaps: [['toEqual([]),\n      noEvents(),\n    ),\n    s.step(\n      "read back, it settled once', `toEqual([${SETTLED}]),\n      noEvents(),\n    ),\n    s.step(\n      "read back, it settled once`]] },
    { tag: "read-amount", step: "read back, it settled once with the bank's intent", swaps: [['[2000n, "pi_1", "settled"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new', '[2001n, "pi_1", "settled"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new']] },
    { tag: "read-intent", step: "read back, it settled once with the bank's intent", swaps: [['[2000n, "pi_1", "settled"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new', '[2000n, "pi_2", "settled"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new']] },
    { tag: "read-state", step: "read back, it settled once with the bank's intent", swaps: [['[2000n, "pi_1", "settled"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new', '[2000n, "pi_1", "pending"]),\n      noEvents(),\n    ),\n    s.step(\n      "the bank says it with a new']] },
    { tag: "second-accepted", step: "the bank says it with a new event id and another intent", swaps: [['toEqual({ accepted: true }),\n    ),\n    s.step(\n      "the payment refuses', 'toEqual({ seen: true }),\n    ),\n    s.step(\n      "the payment refuses']] },
    { tag: "second-delivered", step: "the payment refuses it, which is an answer: refused, not retried, nothing emitted", swaps: [['state: "refused" }]', 'state: "delivered" }]']] },
    { tag: "second-failed", step: "the payment refuses it, which is an answer: refused, not retried, nothing emitted", swaps: [['state: "refused" }]', 'state: "failed" }]']] },
    { tag: "second-emits", step: "the payment refuses it, which is an answer: refused, not retried, nothing emitted", swaps: [['noEvents(),\n    ),\n    s.step(\n      "read back, still the first intent"', 'emits(PaymentSettled, { payment: s.world.payment, intent: "pi_2" }),\n    ),\n    s.step(\n      "read back, still the first intent"']] },
    { tag: "last-intent", step: "read back, still the first intent", swaps: [['[2000n, "pi_1", "settled"]),\n      noEvents(),\n    ),\n  ],', '[2000n, "pi_2", "settled"]),\n      noEvents(),\n    ),\n  ],']] },
  ],
};

export const BAD: Plan = {
  file: "a-bad-word-changes-nothing",
  name: "a bad word from the bank changes nothing",
  steps: 8,
  cases: [
    { tag: "wrong-tag", step: "a word signed with the wrong secret is refused", swaps: [['refuses(Blueprint.BadSignature),\n      noEvents(),\n      spans({ present: ["in.bank", "in.bank.refused"]', 'refuses(Blueprint.NotAllowed),\n      noEvents(),\n      spans({ present: ["in.bank", "in.bank.refused"]']] },
    { tag: "wrong-emits", step: "a word signed with the wrong secret is refused", swaps: [['noEvents(),\n      spans({ present: ["in.bank", "in.bank.refused"]', 'emits(PaymentSettled, { payment: s.world.payment, intent: "pi_9" }),\n      spans({ present: ["in.bank", "in.bank.refused"]']] },
    { tag: "late-tag", step: "a word signed ten minutes ago is refused", swaps: [['refuses(Blueprint.BadSignature),\n      noEvents(),\n      spans({ present: ["in.bank.refused"]', 'refuses(Blueprint.NotAllowed),\n      noEvents(),\n      spans({ present: ["in.bank.refused"]']] },
    { tag: "late-span", step: "a word signed ten minutes ago is refused", swaps: [['spans({ present: ["in.bank.refused"], absent: ["in.bank.accepted"] })', 'spans({ present: ["in.bank.accepted"] })']] },
    { tag: "waiting", step: "nothing is waiting to be delivered", swaps: [['toEqual([]),\n      noEvents(),\n    ),\n    s.step(\n      "read back, the payment is still pending"', `toEqual([${SETTLED}]),\n      noEvents(),\n    ),\n    s.step(\n      "read back, the payment is still pending"`]] },
    { tag: "pending-intent", step: "read back, the payment is still pending", swaps: [['["", "pending"]', '["pi_9", "pending"]']] },
    { tag: "pending-state", step: "read back, the payment is still pending", swaps: [['["", "pending"]', '["", "settled"]']] },
    { tag: "reuse-seen", step: "the true word with the same event id is accepted: a refused one never used the id up", swaps: [['toEqual({ accepted: true }),\n    ),\n    s.step(\n      "the payment settles', 'toEqual({ seen: true }),\n    ),\n    s.step(\n      "the payment settles']] },
    { tag: "settle-intent", step: "the payment settles, called by the bank", swaps: [['intent: "pi_9" }),\n      calledBy', 'intent: "pi_8" }),\n      calledBy']] },
    { tag: "settle-called-by", step: "the payment settles, called by the bank", swaps: [['calledBy(Blueprint.service(bank)),\n    ),\n    s.step(\n      "a refund', 'calledBy(Blueprint.system),\n    ),\n    s.step(\n      "a refund']] },
    { tag: "refund-accepted", step: "a refund the app never takes in is answered 200 and kept nowhere", swaps: [["toEqual({ ignored: true })", "toEqual({ accepted: true })"]] },
    { tag: "refund-emits", step: "a refund the app never takes in is answered 200 and kept nowhere", swaps: [['noEvents(),\n      spans({ present: ["in.bank.ignored"]', 'emits(PaymentSettled, { payment: s.world.payment, intent: "pi_9" }),\n      spans({ present: ["in.bank.ignored"]']] },
    { tag: "refund-span", step: "a refund the app never takes in is answered 200 and kept nowhere", swaps: [['present: ["in.bank.ignored"], absent: ["in.bank.accepted"]', 'present: ["in.bank.accepted"]']] },
    { tag: "last-waiting", step: "it settles nothing", swaps: [['toEqual([]),\n      noEvents(),\n    ),\n  ],', `toEqual([${SETTLED}]),\n      noEvents(),\n    ),\n  ],`]] },
  ],
};

export const OUTSIDER: Plan = {
  file: "an-outsider-cannot-settle",
  name: "an outsider cannot settle a payment",
  steps: 3,
  cases: [
    { tag: "bob-tag", step: "bob settles it himself and is refused", swaps: [['refuses(Blueprint.NotAllowed),\n      noEvents(),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,', 'refuses(Blueprint.BadSignature),\n      noEvents(),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,']] },
    { tag: "bob-ran", step: "bob settles it himself and is refused", swaps: [['spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,', 'spans({ present: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,']] },
    { tag: "bob-answers", step: "bob settles it himself and is refused", swaps: [['noEvents(),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,', 'expect((a) => a).toEqual({ payment: s.world.payment }),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "ada,']] },
    { tag: "ada-tag", step: "ada, who started it, is refused too", swaps: [['refuses(Blueprint.NotAllowed),\n      noEvents(),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "read back', 'refuses(Blueprint.BadSignature),\n      noEvents(),\n      spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "read back']] },
    { tag: "ada-ran", step: "ada, who started it, is refused too", swaps: [['spans({ absent: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "read back', 'spans({ present: ["payment.settle.record"] }),\n    ),\n    s.step(\n      "read back']] },
    { tag: "read-settled", step: "read back, the payment is still pending", swaps: [['["", "pending"]', '["pi_x", "settled"]']] },
  ],
};

export const PLANS: ReadonlyArray<Plan> = [ONCE, BAD, OUTSIDER];
