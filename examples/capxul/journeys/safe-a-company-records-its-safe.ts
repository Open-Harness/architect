// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): a company's Safe is owned by its founder's own Safe, so its address changes
// with the founder's Safe and its own id, and nothing else. Ada runs Acme Trading and Acme Logistics, Bo runs Bo Ltd.
// `three company safes` recorded each Safe by another way in: Ada's own by her key (the command line), Bo's by his agent
// (MCP), Acme Trading's by Ada's agent, Acme Logistics' by her key, Bo Ltd's in Bo's session. So each read-back below
// holds what a record answered by that way to what was kept, and to the address support/safe-address.ts works out.
import { Blueprint, Via, expect, noEvents, refuses, spans } from "orthograph";
import { SafeAlreadyRecorded } from "../blueprint/things/safe/errors.ts";
import record from "../blueprint/things/safe/verbs/record.ts";
import recordCompany from "../blueprint/things/safe/verbs/record-company.ts";
import get from "../blueprint/things/safe/verbs/get.ts";
import list from "../blueprint/things/safe/verbs/list.ts";
import { addressProblem, localBootstrap } from "./support/safe-address.ts";

type SafeItem = { readonly id: string; readonly kind: string; readonly company?: string; readonly account: string };

export default Blueprint.journey("safe: a company records its safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "three company safes",
  steps: (s) => [
    s.step(
      "Ada's first request again, by her key, is the same call: her one Safe, and nothing new",
      s.ada.via(Via.key).run(record, {}, { request: "ada-safe" }),
      expect((a) => [a.safe, a.account]).toEqual([s.world.adaSafe, s.world.adaAccount]),
      noEvents(),
    ),
    s.step(
      "Ada's Safe holds the address her key was answered, the factory's for her id",
      s.ada.run(get, { id: s.world.adaSafe }),
      expect((a) => [a.kind, a.person, a.company ?? "none", a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "personal", s.ada.person, "none", s.world.adaAccount, localBootstrap, [localBootstrap], 1n, "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo's Safe holds the address his agent was answered",
      s.bo.run(get, { id: s.world.boSafe }),
      expect((a) => [a.kind, a.person, a.company ?? "none", a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "personal", s.bo.person, "none", s.world.boAccount, localBootstrap, [localBootstrap], 1n, "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo can't record a Safe for Ada's company",
      s.bo.run(recordCompany, { company: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["safe.record-company.refused"], absent: ["safe.record-company"] }),
    ),
    s.step(
      "nor can Bo's agent",
      s.bo.via(Via.agent).run(recordCompany, { company: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo can't read Acme Trading's Safe",
      s.bo.run(get, { id: s.world.tradingSafe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "nor list Acme Trading's Safes",
      s.bo.run(list, { company: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Acme Trading's Safe holds what Ada's agent was answered: owned by her own Safe alone, at the factory's address for that owner and the company's id",
      s.ada.run(get, { id: s.world.tradingSafe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company", s.world.company, "none", s.world.tradingAccount, s.world.adaAccount, [s.world.adaAccount], 1n, "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Acme Trading has that one Safe and no other",
      s.ada.run(list, { company: s.world.company }),
      expect((p) => p.items.map((i: SafeItem) => [i.id, i.kind, i.company, i.account])).toEqual([
        [s.world.tradingSafe, "company", s.world.company, s.world.tradingAccount],
      ]),
      noEvents(),
    ),
    s.step(
      "Ada's agent's request again is the same call, and nothing new",
      s.ada.via(Via.agent).run(recordCompany, { company: s.world.company }, { request: "acme-trading-safe" }),
      expect((a) => [a.safe, a.account]).toEqual([s.world.tradingSafe, s.world.tradingAccount]),
      noEvents(),
    ),
    s.step(
      "Ada reads Acme Trading's Safe again, for its salt nonce",
      s.ada.run(get, { id: s.world.tradingSafe }),
      expect((a) => a.account).toBe(s.world.tradingAccount),
      noEvents(),
    ),
    s.step(
      "a second Safe for Acme Trading, a new request, is refused, naming that salt nonce",
      s.ada.via(Via.key).run(recordCompany, { company: s.world.company }),
      refuses(SafeAlreadyRecorded, { saltNonce: s.last.saltNonce }),
      noEvents(),
    ),
    s.step(
      "Acme Logistics' Safe holds what Ada's key was answered: the same owner, Ada's Safe, and an address of its own",
      s.ada.run(get, { id: s.world.logisticsSafe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company", s.world.otherCompany, "none", s.world.logisticsAccount, s.world.adaAccount, [s.world.adaAccount], 1n, "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Acme Logistics has that one Safe and no other",
      s.ada.run(list, { company: s.world.otherCompany }),
      expect((p) => p.items.map((i: SafeItem) => [i.id, i.kind, i.company, i.account])).toEqual([
        [s.world.logisticsSafe, "company", s.world.otherCompany, s.world.logisticsAccount],
      ]),
      noEvents(),
    ),
    s.step(
      "Bo Ltd's Safe holds what Bo was answered: owned by Bo's own Safe, not Ada's, and its address follows",
      s.bo.run(get, { id: s.world.boLtdSafe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company", s.world.boCompany, "none", s.world.boLtdAccount, s.world.boAccount, [s.world.boAccount], 1n, "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo Ltd has that one Safe and no other",
      s.bo.run(list, { company: s.world.boCompany }),
      expect((p) => p.items.map((i: SafeItem) => [i.id, i.kind, i.company, i.account])).toEqual([
        [s.world.boLtdSafe, "company", s.world.boCompany, s.world.boLtdAccount],
      ]),
      noEvents(),
    ),
  ],
});
