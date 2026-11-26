// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Customer Group and Supplier Group, Frappe NestedSet trees with one root (decisions/CX-parties-payments.md).
// Each is its company's own. Refusal order on create (customer-group/errors.ts, supplier-group/errors.ts):
// Parent…NotInCompany, Parent…IsLedger, …RootExists (carrying the root), then the rule's …NameTaken.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { CustomerGroupCreated } from "../blueprint/things/customer-group/events.ts";
import { SupplierGroupCreated } from "../blueprint/things/supplier-group/events.ts";
import {
  CustomerGroupNameTaken,
  CustomerGroupRootExists,
  ParentCustomerGroupIsLedger,
  ParentCustomerGroupNotInCompany,
} from "../blueprint/things/customer-group/errors.ts";
import {
  ParentSupplierGroupIsLedger,
  ParentSupplierGroupNotInCompany,
  SupplierGroupNameTaken,
  SupplierGroupRootExists,
} from "../blueprint/things/supplier-group/errors.ts";
import { machine as customerGroups } from "../blueprint/things/customer-group/machine.ts";
import { machine as supplierGroups } from "../blueprint/things/supplier-group/machine.ts";
import createCustomerGroup from "../blueprint/things/customer-group/verbs/create.ts";
import getCustomerGroup from "../blueprint/things/customer-group/verbs/get.ts";
import createSupplierGroup from "../blueprint/things/supplier-group/verbs/create.ts";
import getSupplierGroup from "../blueprint/things/supplier-group/verbs/get.ts";

export default Blueprint.journey("set up party groups", {
  // Acme Trading's customer groups: All Customer Groups (its root, a group) > Commercial (a ledger); its supplier
  // groups: All Supplier Groups > Services (a ledger). Ada also runs Acme Logistics, which has no groups yet. Bo is
  // signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a supplier group",
  steps: (s) => {
    const cg = (spec: { readonly customerGroupName: string; readonly parentCustomerGroup?: unknown; readonly isGroup: boolean }, company: unknown = s.world.company) =>
      s.ada.run(createCustomerGroup, { company, ...spec } as never);
    const sg = (spec: { readonly supplierGroupName: string; readonly parentSupplierGroup?: unknown; readonly isGroup: boolean }, company: unknown = s.world.company) =>
      s.ada.run(createSupplierGroup, { company, ...spec } as never);
    const readC = (a: Record<string, unknown>) => [a["company"], a["customerGroupName"], a["parentCustomerGroup"] ?? null, a["state"]];
    const readS = (a: Record<string, unknown>) => [a["company"], a["supplierGroupName"], a["parentSupplierGroup"] ?? null, a["state"]];
    return [
      // Customer groups.
      s.step(
        "the root customer group reads back Acme Trading's, a group with no parent",
        s.ada.run(getCustomerGroup, { id: s.world.allCustomerGroups }),
        expect(readC).toEqual([s.world.company, "All Customer Groups", null, "group"]),
        noEvents(),
      ),
      s.step(
        "the ledger customer group reads back under it",
        s.ada.run(getCustomerGroup, { id: s.world.customerGroup }),
        expect(readC).toEqual([s.world.company, "Commercial", s.world.allCustomerGroups, "ledger"]),
      ),
      s.step("Bo can't read it", s.bo.run(getCustomerGroup, { id: s.world.customerGroup }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add a customer group to Acme Trading",
        s.bo.run(createCustomerGroup, { company: s.world.company, customerGroupName: "Retail", parentCustomerGroup: s.world.allCustomerGroups, isGroup: true }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["customer-group.create", "customer-group.create.insert"] }),
      ),
      s.step(
        "a second root for Acme Trading is refused, carrying the root it has",
        cg({ customerGroupName: "Everyone", isGroup: true }),
        refuses(CustomerGroupRootExists, { root: s.world.allCustomerGroups }),
        noEvents(),
        spans({ absent: ["customer-group.create.insert"] }),
      ),
      s.step(
        "as a ledger too",
        cg({ customerGroupName: "Everyone", isGroup: false }),
        refuses(CustomerGroupRootExists, { root: s.world.allCustomerGroups }),
        noEvents(),
      ),
      s.step(
        "and before the name it would take twice: the root is judged first",
        cg({ customerGroupName: "All Customer Groups", isGroup: true }),
        refuses(CustomerGroupRootExists, { root: s.world.allCustomerGroups }),
        noEvents(),
      ),
      s.step(
        "a group under a ledger is refused",
        cg({ customerGroupName: "Corner Shops", parentCustomerGroup: s.world.customerGroup, isGroup: false }),
        refuses(ParentCustomerGroupIsLedger),
        noEvents(),
      ),
      s.step(
        "before a name already taken",
        cg({ customerGroupName: "Commercial", parentCustomerGroup: s.world.customerGroup, isGroup: true }),
        refuses(ParentCustomerGroupIsLedger),
        noEvents(),
      ),
      s.step(
        "Ada adds a group under the root",
        cg({ customerGroupName: "Retail", parentCustomerGroup: s.world.allCustomerGroups, isGroup: true }),
        expect((a) => a.customerGroup).toMatch(/^cgr_[0-9a-z]+$/),
        emits(CustomerGroupCreated, { customerGroup: s.last.customerGroup, company: s.world.company }),
        customerGroups.isIn(s.last.customerGroup, "group"),
        spans({ present: ["customer-group.create", "customer-group.create.load", "customer-group.create.insert"] }),
      ),
      s.step(
        "a name already taken in the company is refused, under another parent",
        cg({ customerGroupName: "Commercial", parentCustomerGroup: s.last.customerGroup, isGroup: false }),
        refuses(CustomerGroupNameTaken),
        noEvents(),
      ),
      s.step(
        "Ada adds a ledger under the new group, two levels below the root",
        cg({ customerGroupName: "Corner Shops", parentCustomerGroup: s.last.customerGroup, isGroup: false }),
        customerGroups.isIn(s.last.customerGroup, "ledger"),
      ),
      s.step(
        "it reads back a ledger under the new group, not under the root",
        s.ada.run(getCustomerGroup, { id: s.last.customerGroup }),
        expect((a) => [a.company, a.customerGroupName, a.state]).toEqual([s.world.company, "Corner Shops", "ledger"]),
        expect((a) => a.parentCustomerGroup).toMatch(/^cgr_[0-9a-z]+$/),
      ),
      s.step(
        "its parent reads back as the group made before it, a group under the root",
        s.ada.run(getCustomerGroup, { id: s.last.parentCustomerGroup }),
        expect(readC).toEqual([s.world.company, "Retail", s.world.allCustomerGroups, "group"]),
      ),
      s.step(
        "Acme Logistics may have its own root, of the same name",
        cg({ customerGroupName: "All Customer Groups", isGroup: true }, s.world.otherCompany),
        emits(CustomerGroupCreated, { customerGroup: s.last.customerGroup, company: s.world.otherCompany }),
        customerGroups.isIn(s.last.customerGroup, "group"),
      ),
      s.step(
        "a second root for Acme Logistics carries its own root, not Acme Trading's",
        cg({ customerGroupName: "Everyone", isGroup: true }, s.world.otherCompany),
        refuses(CustomerGroupRootExists, { root: s.last.customerGroup }),
        noEvents(),
      ),
      s.step(
        "an Acme Trading group under Acme Logistics' root is refused",
        cg({ customerGroupName: "Exporters", parentCustomerGroup: s.last.customerGroup, isGroup: false }),
        refuses(ParentCustomerGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "Acme Logistics may have a ledger group of the same name as Acme Trading's, under its root",
        cg({ customerGroupName: "Commercial", parentCustomerGroup: s.last.customerGroup, isGroup: false }, s.world.otherCompany),
        customerGroups.isIn(s.last.customerGroup, "ledger"),
      ),
      s.step(
        "an Acme Trading group under that ledger is refused for its company first",
        cg({ customerGroupName: "Exporters", parentCustomerGroup: s.last.customerGroup, isGroup: false }),
        refuses(ParentCustomerGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "while Acme Logistics' own is refused for the ledger",
        cg({ customerGroupName: "Exporters", parentCustomerGroup: s.last.customerGroup, isGroup: false }, s.world.otherCompany),
        refuses(ParentCustomerGroupIsLedger),
        noEvents(),
      ),
      s.step(
        "that ledger reads back in Acme Logistics, under its own root",
        s.ada.run(getCustomerGroup, { id: s.last.customerGroup }),
        expect((a) => [a.company, a.customerGroupName, a.state]).toEqual([s.world.otherCompany, "Commercial", "ledger"]),
        expect((a) => a.parentCustomerGroup).toMatch(/^cgr_[0-9a-z]+$/),
      ),
      s.step(
        "its parent reads back as Acme Logistics' root",
        s.ada.run(getCustomerGroup, { id: s.last.parentCustomerGroup }),
        expect(readC).toEqual([s.world.otherCompany, "All Customer Groups", null, "group"]),
      ),

      // Supplier groups: the same rules.
      s.step(
        "the root supplier group reads back Acme Trading's",
        s.ada.run(getSupplierGroup, { id: s.world.allSupplierGroups }),
        expect(readS).toEqual([s.world.company, "All Supplier Groups", null, "group"]),
      ),
      s.step(
        "the ledger supplier group reads back under it",
        s.ada.run(getSupplierGroup, { id: s.world.supplierGroup }),
        expect(readS).toEqual([s.world.company, "Services", s.world.allSupplierGroups, "ledger"]),
      ),
      s.step("Bo can't read it", s.bo.run(getSupplierGroup, { id: s.world.supplierGroup }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add a supplier group",
        s.bo.run(createSupplierGroup, { company: s.world.company, supplierGroupName: "Raw Materials", parentSupplierGroup: s.world.allSupplierGroups, isGroup: false }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "a second root is refused, carrying the root",
        sg({ supplierGroupName: "Vendors", isGroup: true }),
        refuses(SupplierGroupRootExists, { root: s.world.allSupplierGroups }),
        noEvents(),
      ),
      s.step(
        "a group under a ledger is refused",
        sg({ supplierGroupName: "Cleaning", parentSupplierGroup: s.world.supplierGroup, isGroup: false }),
        refuses(ParentSupplierGroupIsLedger),
        noEvents(),
      ),
      s.step(
        "Ada adds a second ledger supplier group under the root",
        sg({ supplierGroupName: "Raw Materials", parentSupplierGroup: s.world.allSupplierGroups, isGroup: false }),
        expect((a) => a.supplierGroup).toMatch(/^sgr_[0-9a-z]+$/),
        emits(SupplierGroupCreated, { supplierGroup: s.last.supplierGroup, company: s.world.company }),
        supplierGroups.isIn(s.last.supplierGroup, "ledger"),
        spans({ present: ["supplier-group.create", "supplier-group.create.load", "supplier-group.create.insert"] }),
      ),
      s.step(
        "it reads back as she typed it",
        s.ada.run(getSupplierGroup, { id: s.last.supplierGroup }),
        expect(readS).toEqual([s.world.company, "Raw Materials", s.world.allSupplierGroups, "ledger"]),
      ),
      s.step(
        "a name already taken is refused",
        sg({ supplierGroupName: "Services", parentSupplierGroup: s.world.allSupplierGroups, isGroup: false }),
        refuses(SupplierGroupNameTaken),
        noEvents(),
      ),
      s.step(
        "a customer group's name is no supplier group's: it is free here",
        sg({ supplierGroupName: "Commercial", parentSupplierGroup: s.world.allSupplierGroups, isGroup: false }),
        supplierGroups.isIn(s.last.supplierGroup, "ledger"),
      ),
      s.step(
        "Acme Logistics may have its own root",
        sg({ supplierGroupName: "All Supplier Groups", isGroup: true }, s.world.otherCompany),
        supplierGroups.isIn(s.last.supplierGroup, "group"),
      ),
      s.step(
        "an Acme Trading group under it is refused",
        sg({ supplierGroupName: "Fuel", parentSupplierGroup: s.last.supplierGroup, isGroup: false }),
        refuses(ParentSupplierGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "and so is a second root for Acme Logistics, carrying its own root",
        sg({ supplierGroupName: "Vendors", isGroup: true }, s.world.otherCompany),
        refuses(SupplierGroupRootExists, { root: s.last.supplierGroup }),
        noEvents(),
      ),
    ];
  },
});
