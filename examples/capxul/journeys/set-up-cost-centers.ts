// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Cost Center (decisions/CX-ledger.md). Refusal order on create (cost-center/errors.ts):
// ParentCostCenterNotInCompany, ParentCostCenterIsLedger, RootCostCenterIsLedger, then the rule's CostCenterNameTaken.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { CostCenterCreated } from "../blueprint/things/cost-center/events.ts";
import { CostCenterNameTaken, ParentCostCenterIsLedger, ParentCostCenterNotInCompany, RootCostCenterIsLedger } from "../blueprint/things/cost-center/errors.ts";
import { machine as centers } from "../blueprint/things/cost-center/machine.ts";
import create from "../blueprint/things/cost-center/verbs/create.ts";
import get from "../blueprint/things/cost-center/verbs/get.ts";

export default Blueprint.journey("set up cost centers", {
  // Acme Trading's cost centers: Acme Trading (a root group) > Operations (a ledger). Ada also runs Acme Logistics,
  // which has none. Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a chart",
  steps: (s) => {
    const add = (spec: { readonly costCenterName: string; readonly parentCostCenter?: unknown; readonly isGroup: boolean }, company: unknown = s.world.company) =>
      s.ada.run(create, { company, ...spec } as never);
    const read = (a: Record<string, unknown>) => [a["company"], a["costCenterName"], a["parentCostCenter"] ?? null, a["state"]];
    return [
      s.step(
        "Acme Trading's ledger cost center reads back under its root",
        s.ada.run(get, { id: s.world.costCenter }),
        expect(read).toEqual([s.world.company, "Operations", s.world.mainCostCenter, "ledger"]),
        noEvents(),
      ),
      s.step(
        "the root reads back a group with no parent",
        s.ada.run(get, { id: s.world.mainCostCenter }),
        expect(read).toEqual([s.world.company, "Acme Trading", null, "group"]),
      ),
      s.step("Bo can't read it", s.bo.run(get, { id: s.world.costCenter }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add a cost center to Acme Trading",
        s.bo.run(create, { company: s.world.company, costCenterName: "Sales", parentCostCenter: s.world.mainCostCenter, isGroup: false }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["cost-center.create", "cost-center.create.insert"] }),
      ),
      s.step(
        "Ada adds Regions, a group under the root",
        add({ costCenterName: "Regions", parentCostCenter: s.world.mainCostCenter, isGroup: true }),
        expect((a) => a.costCenter).toMatch(/^cct_[0-9a-z]+$/),
        emits(CostCenterCreated, { costCenter: s.last.costCenter, company: s.world.company }),
        centers.isIn(s.last.costCenter, "group"),
        spans({ present: ["cost-center.create", "cost-center.create.insert"] }),
      ),
      s.step(
        "and Nairobi, a ledger under Regions",
        add({ costCenterName: "Nairobi", parentCostCenter: s.last.costCenter, isGroup: false }),
        centers.isIn(s.last.costCenter, "ledger"),
      ),
      s.step(
        "Nairobi reads back under Regions",
        s.ada.run(get, { id: s.last.costCenter }),
        expect((a) => [a.company, a.costCenterName, a.state]).toEqual([s.world.company, "Nairobi", "ledger"]),
        expect((a) => a.parentCostCenter).toMatch(/^cct_[0-9a-z]+$/),
      ),
      s.step(
        "a cost center under a ledger is refused",
        add({ costCenterName: "Sales", parentCostCenter: s.world.costCenter, isGroup: false }),
        refuses(ParentCostCenterIsLedger),
        noEvents(),
        spans({ absent: ["cost-center.create.insert"] }),
      ),
      s.step("a group under one too", add({ costCenterName: "Sales", parentCostCenter: s.world.costCenter, isGroup: true }), refuses(ParentCostCenterIsLedger)),
      s.step("a root that isn't a group is refused", add({ costCenterName: "Head Office", isGroup: false }), refuses(RootCostCenterIsLedger), noEvents()),
      s.step(
        "a second cost center under a taken name is refused, under any parent",
        add({ costCenterName: "Operations", parentCostCenter: s.world.mainCostCenter, isGroup: true }),
        refuses(CostCenterNameTaken),
        noEvents(),
      ),
      s.step(
        "a taken name under a ledger is refused for the ledger first",
        add({ costCenterName: "Operations", parentCostCenter: s.world.costCenter, isGroup: false }),
        refuses(ParentCostCenterIsLedger),
      ),
      s.step(
        "Ada's other company starts its own cost centers, under its own name",
        add({ costCenterName: "Acme Logistics", isGroup: true }, s.world.otherCompany),
        emits(CostCenterCreated, { costCenter: s.last.costCenter, company: s.world.otherCompany }),
        centers.isIn(s.last.costCenter, "group"),
      ),
      s.step(
        "an Acme Trading cost center under it is refused",
        add({ costCenterName: "Kampala", parentCostCenter: s.last.costCenter, isGroup: false }),
        refuses(ParentCostCenterNotInCompany),
        noEvents(),
        spans({ absent: ["cost-center.create.insert"] }),
      ),
      s.step(
        "the other company may reuse Acme Trading's ledger's name for a ledger of its own",
        add({ costCenterName: "Operations", parentCostCenter: s.last.costCenter, isGroup: false }, s.world.otherCompany),
        centers.isIn(s.last.costCenter, "ledger"),
      ),
      s.step(
        "an Acme Trading cost center under that ledger is refused for the company first",
        add({ costCenterName: "Kampala", parentCostCenter: s.last.costCenter, isGroup: true }),
        refuses(ParentCostCenterNotInCompany),
      ),
      s.step(
        "and that ledger is the other company's",
        s.ada.run(get, { id: s.last.costCenter }),
        expect((a) => [a.company, a.costCenterName, a.state]).toEqual([s.world.otherCompany, "Operations", "ledger"]),
      ),
    ];
  },
});
