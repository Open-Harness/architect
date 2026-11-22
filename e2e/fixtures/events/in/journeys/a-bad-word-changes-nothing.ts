// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `signed: "wrongly"` signs with another secret; `signed: "late"` signs with the right one at a time ten minutes gone,
// past the bank's five minutes of tolerance. The door answers both 401 `{ _tag: "BadSignature" }` (M5-checks, call 4).
import { Blueprint, calledBy, emits, expect, noEvents, refuses, spans } from "orthograph";
import { PaymentSettled } from "../blueprint/things/payment/events.ts";
import get from "../blueprint/things/payment/verbs/get.ts";
import bank from "../blueprint/adapters/bank.ts";

export default Blueprint.journey("a bad word from the bank changes nothing", {
  cast: { ada: Blueprint.anyone },
  starts: "a-payment-is-pending",
  steps: (s) => [
    s.step(
      "a word signed with the wrong secret is refused",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_9" }, { id: "evt_x", signed: "wrongly" }),
      refuses(Blueprint.BadSignature),
      noEvents(),
      spans({ present: ["in.bank", "in.bank.refused"], absent: ["in.bank.accepted"] }),
    ),
    s.step(
      "a word signed ten minutes ago is refused",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_9" }, { id: "evt_x", signed: "late" }),
      refuses(Blueprint.BadSignature),
      noEvents(),
      spans({ present: ["in.bank.refused"], absent: ["in.bank.accepted"] }),
    ),
    s.step(
      "nothing is waiting to be delivered",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([]),
      noEvents(),
    ),
    s.step(
      "read back, the payment is still pending",
      s.ada.run(get, { id: s.world.payment }),
      expect((a) => [a.intent, a.state]).toEqual(["", "pending"]),
    ),
    s.step(
      "the true word with the same event id is accepted: a refused one never used the id up",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_9" }, { id: "evt_x" }),
      expect((a) => a).toEqual({ accepted: true }),
    ),
    s.step(
      "the payment settles, called by the bank",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "checkoutCompleted", to: "op:payment.settle", state: "delivered" }]),
      emits(PaymentSettled, { payment: s.world.payment, intent: "pi_9" }),
      calledBy(Blueprint.service(bank)),
    ),
    s.step(
      "a refund the app never takes in is answered 200 and kept nowhere",
      s.bank.sends(bank.events.chargeRefunded, { reference: s.world.payment, amount: 500n }, { id: "evt_r" }),
      expect((a) => a).toEqual({ ignored: true }),
      noEvents(),
      spans({ present: ["in.bank.ignored"], absent: ["in.bank.accepted"] }),
    ),
    s.step(
      "it settles nothing",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([]),
      noEvents(),
    ),
  ],
});
