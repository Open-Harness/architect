// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `payment.settle` admits `Blueprint.service(bank)` and nobody else: a signed-in person, whoever they are, is refused
// `NotAllowed` and the handler never runs.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import get from "../blueprint/things/payment/verbs/get.ts";
import settle from "../blueprint/things/payment/verbs/settle.ts";

export default Blueprint.journey("an outsider cannot settle a payment", {
  cast: { ada: Blueprint.anyone, bob: Blueprint.signedIn },
  starts: "a-payment-is-pending",
  steps: (s) => [
    s.step(
      "bob settles it himself and is refused",
      s.bob.run(settle, { payment: s.world.payment, intent: "pi_x" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["payment.settle.record"] }),
    ),
    s.step(
      "ada, who started it, is refused too",
      s.ada.run(settle, { payment: s.world.payment, intent: "pi_y" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["payment.settle.record"] }),
    ),
    s.step(
      "read back, the payment is still pending",
      s.ada.run(get, { id: s.world.payment }),
      expect((a) => [a.intent, a.state]).toEqual(["", "pending"]),
    ),
  ],
});
