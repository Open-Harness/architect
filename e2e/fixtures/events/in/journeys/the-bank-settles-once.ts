// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.bank.sends(event, fields, { id })` signs the event with the secret the world made for the mount and posts it to
// /_in/bank; it answers the door's body: `{ accepted: true }`, `{ seen: true }` or `{ ignored: true }`. `s.world.settles()`
// waits until the outbox is empty and answers `{ deliveries: [{ event, to, state }] }`, the deliveries that finished;
// the events those calls made are that step's journal (design/decisions/M5-checks.md).
import { Blueprint, calledBy, emits, expect, noEvents, spans } from "orthograph";
import { machine } from "../blueprint/things/payment/machine.ts";
import { PaymentSettled } from "../blueprint/things/payment/events.ts";
import get from "../blueprint/things/payment/verbs/get.ts";
import bank from "../blueprint/adapters/bank.ts";

export default Blueprint.journey("the bank settles a payment once", {
  cast: { ada: Blueprint.anyone },
  starts: "a-payment-is-pending",
  steps: (s) => [
    s.step(
      "the bank says the checkout completed",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_1" }, { id: "evt_1" }),
      expect((a) => a).toEqual({ accepted: true }),
      spans({ present: ["in.bank", "in.bank.accepted"], absent: ["in.bank.refused"] }),
    ),
    s.step(
      "the payment settles, called by the bank",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "checkoutCompleted", to: "op:payment.settle", state: "delivered" }]),
      emits(PaymentSettled, { payment: s.world.payment, intent: "pi_1" }),
      calledBy(Blueprint.service(bank)),
      machine.isIn(s.world.payment, "settled"),
    ),
    s.step(
      "the bank says it again, with the same event id",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_1" }, { id: "evt_1" }),
      expect((a) => a).toEqual({ seen: true }),
      noEvents(),
      spans({ present: ["in.bank.seen"], absent: ["in.bank.accepted"] }),
    ),
    s.step(
      "nothing more settles",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([]),
      noEvents(),
    ),
    s.step(
      "read back, it settled once with the bank's intent",
      s.ada.run(get, { id: s.world.payment }),
      expect((a) => [a.amount, a.intent, a.state]).toEqual([2000n, "pi_1", "settled"]),
      noEvents(),
    ),
    s.step(
      "the bank says it with a new event id and another intent",
      s.bank.sends(bank.events.checkoutCompleted, { reference: s.world.payment, intent: "pi_2" }, { id: "evt_2" }),
      expect((a) => a).toEqual({ accepted: true }),
    ),
    s.step(
      "the payment refuses it, which is an answer: refused, not retried, nothing emitted",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "checkoutCompleted", to: "op:payment.settle", state: "refused" }]),
      noEvents(),
    ),
    s.step(
      "read back, still the first intent",
      s.ada.run(get, { id: s.world.payment }),
      expect((a) => [a.amount, a.intent, a.state]).toEqual([2000n, "pi_1", "settled"]),
      noEvents(),
    ),
  ],
});
