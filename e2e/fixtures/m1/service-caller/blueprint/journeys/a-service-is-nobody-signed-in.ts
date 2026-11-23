// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It lives in the adapter fixture app (`e2e/fixtures/m1/service-caller`), which mounts `@fixture/remote` as `pricing` and `@fixture/ledger`
// as `ledger`; the refusals and the passes are the runtime's, so the handlers are real and none is blank.
//
// A `service` role admits `service(<its mount>)` and nobody else; `signedIn` admits a person or an agent and not a service; `Blueprint.system` admits the
// system and nobody else (M2-auth, fork 3). Every kind is tried at every operation that matters: steps 4 and 8 to 12 are the controls that let a kind
// through where another was refused, so a runtime that refuses (or admits) everyone, or one kind too many, cannot pass.
import { Blueprint, Via, expect, noEvents, refuses, spans } from "orthograph";
import { ledgerer, pricer } from "../things/probe/roles.ts";
import who from "../things/probe/verbs/who.ts";
import price from "../things/probe/verbs/price.ts";
import tick from "../things/probe/verbs/tick.ts";
import ledger from "../things/probe/verbs/ledger.ts";
import ping from "../things/probe/verbs/ping.ts";

export default Blueprint.journey("a service is nobody signed in", {
  cast: { pricer, other: ledgerer, ada: Blueprint.signedIn, clock: Blueprint.system },
  steps: (s) => [
    s.step(
      "the pricing service can't call what needs a person signed in",
      s.pricer.run(who, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.who.refused"], absent: ["probe.who"] }),
    ),
    s.step(
      "the pricing service can call what its own role admits",
      s.pricer.run(price, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.price"] }),
    ),
    s.step(
      "the ledger service, another mount's, can't call the pricing service's operation",
      s.other.run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
    s.step(
      "ada, a person, is let through where the service was refused",
      s.ada.run(who, {}),
      expect((a) => a.status).toBe("ok"),
      spans({ present: ["probe.who"] }),
    ),
    s.step(
      "ada, a person, is refused where the service was let through",
      s.ada.run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
    s.step(
      "ada's agent is no service either",
      s.ada.via(Via.agent).run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
    s.step(
      "the system is no service either",
      s.clock.run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
    s.step(
      "the system is let through what is for the system",
      s.clock.run(tick, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.tick"] }),
    ),
    s.step(
      "ada, a person, is refused what is for the system",
      s.ada.run(tick, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.tick.refused"], absent: ["probe.tick"] }),
    ),
    s.step(
      "the pricing service is refused what is for the system",
      s.pricer.run(tick, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.tick.refused"], absent: ["probe.tick"] }),
    ),
    s.step(
      "the ledger service is let through its own role's operation",
      s.other.run(ledger, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.ledger"] }),
    ),
    s.step(
      "anyone means every kind: the system and a service may both ping",
      s.clock.run(ping, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.ping"] }),
    ),
    s.step(
      "the pricing service may ping too",
      s.pricer.run(ping, {}),
      expect((a) => a.status).toBe("ok"),
      spans({ present: ["probe.ping"] }),
    ),
    s.step(
      "the pricing service is refused the ledger service's operation",
      s.pricer.run(ledger, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.ledger.refused"], absent: ["probe.ledger"] }),
    ),
  ],
});
