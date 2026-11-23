// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// `bridge` is the system: until Capxul mounts the Bridge adapter and its webhook door, Bridge's reports arrive as the
// system's calls (README.md, "Who speaks for Bridge").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { KybApproved, KybRejected, KybStarted } from "../blueprint/things/bridge-business/events.ts";
import { machine } from "../blueprint/things/bridge-business/machine.ts";
import { KybNotApproved } from "../blueprint/things/bank-account/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import start from "../blueprint/things/bridge-business/verbs/start.ts";
import approve from "../blueprint/things/bridge-business/verbs/approve.ts";
import reject from "../blueprint/things/bridge-business/verbs/reject.ts";
import get from "../blueprint/things/bridge-business/verbs/get.ts";
import open from "../blueprint/things/bank-account/verbs/open.ts";

export default Blueprint.journey("bridge: kyb is decided by bridge", {
  cast: { ada: owner, bo: Blueprint.signedIn, bridge: Blueprint.system },
  starts: "kyb started",
  steps: (s) => [
    s.step(
      "Ada can't approve her own company's KYB",
      s.ada.run(approve, { business: s.world.business }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.business, "started"),
    ),
    s.step(
      "nor open a bank account before Bridge approves it",
      s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }),
      refuses(KybNotApproved),
      noEvents(),
      spans({ present: ["bank-account.open", "bank-account.open.load"], absent: ["bank-account.open.insert"] }),
    ),
    s.step(
      "Bridge approves it",
      s.bridge.run(approve, { business: s.world.business }),
      expect((a) => a.business).toBe(s.world.business),
      emits(KybApproved, { business: s.world.business }),
      machine.isIn(s.world.business, "approved"),
      spans({ present: ["bridge-business.approve", "bridge-business.approve.update"] }),
    ),
    s.step(
      "an approved KYB can't be approved again",
      s.bridge.run(approve, { business: s.world.business }),
      refuses(machine.notFrom, { state: "approved" }),
      noEvents(),
    ),
    s.step(
      "nor turned down afterwards",
      s.bridge.run(reject, { business: s.world.business, reason: "documents expired" }),
      refuses(machine.notFrom, { state: "approved" }),
      noEvents(),
      machine.isIn(s.world.business, "approved"),
    ),
    s.step(
      "Ada reads it back as approved",
      s.ada.run(get, { id: s.world.business }),
      expect((a) => [a.company, a.state]).toEqual([s.world.company, "approved"]),
      noEvents(),
    ),
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo starts its KYB",
      s.bo.run(start, { company: s.last.company, legalName: "Bo Limited", email: "bo@bo-ltd.test" }),
      expect((a) => a.business).toMatch(/^kyb_[0-9a-z]+$/),
      emits(KybStarted, { business: s.last.business }),
    ),
    s.step(
      "Bo can't turn down his own KYB either",
      s.bo.run(reject, { business: s.last.business, reason: "changed my mind" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.last.business, "started"),
    ),
    s.step(
      "Bridge turns Bo's down, with its reason",
      s.bridge.run(reject, { business: s.last.business, reason: "registration certificate unreadable" }),
      expect((a) => a.business).toMatch(/^kyb_[0-9a-z]+$/),
      emits(KybRejected, { business: s.last.business, reason: "registration certificate unreadable" }),
      machine.isIn(s.last.business, "rejected"),
    ),
    s.step(
      "a turned-down KYB can't then be approved",
      s.bridge.run(approve, { business: s.last.business }),
      refuses(machine.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "and opens no bank account",
      s.bo.run(open, { business: s.last.business, accountName: "Main", currency: "EUR" }),
      refuses(KybNotApproved),
      noEvents(),
      spans({ absent: ["bank-account.open.insert"] }),
    ),
    s.step(
      "Ada's approval is untouched by Bo's refusal",
      s.ada.run(get, { id: s.world.business }),
      expect((a) => a.state).toBe("approved"),
      noEvents(),
    ),
  ],
});
