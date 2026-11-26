// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Customer and Supplier (decisions/CX-parties-payments.md), each its company's own. Refusal order on create
// (customer/errors.ts, supplier/errors.ts): …GroupNotInCompany, then …GroupIsGroup (`validate_customer_group`). The
// group is optional, and two parties may share a name (a naming series names them). `disabled` is a state: disable and
// enable, each refused by the machine from the other state.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { CustomerCreated, CustomerDisabled, CustomerEnabled } from "../blueprint/things/customer/events.ts";
import { SupplierCreated, SupplierDisabled, SupplierEnabled } from "../blueprint/things/supplier/events.ts";
import { CustomerGroupIsGroup, CustomerGroupNotInCompany } from "../blueprint/things/customer/errors.ts";
import { SupplierGroupIsGroup, SupplierGroupNotInCompany } from "../blueprint/things/supplier/errors.ts";
import { machine as customers } from "../blueprint/things/customer/machine.ts";
import { machine as suppliers } from "../blueprint/things/supplier/machine.ts";
import createCustomer from "../blueprint/things/customer/verbs/create.ts";
import getCustomer from "../blueprint/things/customer/verbs/get.ts";
import disableCustomer from "../blueprint/things/customer/verbs/disable.ts";
import enableCustomer from "../blueprint/things/customer/verbs/enable.ts";
import customerBalance from "../blueprint/things/customer/verbs/balance.ts";
import createSupplier from "../blueprint/things/supplier/verbs/create.ts";
import getSupplier from "../blueprint/things/supplier/verbs/get.ts";
import disableSupplier from "../blueprint/things/supplier/verbs/disable.ts";
import enableSupplier from "../blueprint/things/supplier/verbs/enable.ts";
import supplierBalance from "../blueprint/things/supplier/verbs/balance.ts";
import createCustomerGroup from "../blueprint/things/customer-group/verbs/create.ts";
import createSupplierGroup from "../blueprint/things/supplier-group/verbs/create.ts";

export default Blueprint.journey("add customers and suppliers", {
  // Acme Trading's customer Kibo Stores (a company, in Commercial) and supplier Mara Office Rentals (a company, in
  // Services); Acme Logistics' customer Kampala Traders and supplier Nile Fuel, in no group. Ada runs both companies.
  // Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "an outside supplier",
  steps: (s) => {
    const customer = (spec: { readonly customerName: string; readonly customerType: string; readonly customerGroup?: unknown }, company: unknown = s.world.company) =>
      s.ada.run(createCustomer, { company, ...spec } as never);
    const supplier = (spec: { readonly supplierName: string; readonly supplierType: string; readonly supplierGroup?: unknown }, company: unknown = s.world.company) =>
      s.ada.run(createSupplier, { company, ...spec } as never);
    const readC = (a: Record<string, unknown>) => [a["company"], a["customerName"], a["customerType"], a["customerGroup"] ?? null, a["state"]];
    const readS = (a: Record<string, unknown>) => [a["company"], a["supplierName"], a["supplierType"], a["supplierGroup"] ?? null, a["state"]];
    const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];
    return [
      // Customers.
      s.step(
        "Kibo Stores reads back an active company in Commercial",
        s.ada.run(getCustomer, { id: s.world.customer }),
        expect(readC).toEqual([s.world.company, "Kibo Stores", "Company", s.world.customerGroup, "active"]),
        noEvents(),
      ),
      s.step(
        "Kampala Traders reads back in Acme Logistics, in no group",
        s.ada.run(getCustomer, { id: s.world.otherCustomer }),
        expect(readC).toEqual([s.world.otherCompany, "Kampala Traders", "Company", null, "active"]),
      ),
      s.step("Bo can't read Kibo Stores", s.bo.run(getCustomer, { id: s.world.customer }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add a customer to Acme Trading",
        s.bo.run(createCustomer, { company: s.world.company, customerName: "Bo's Shop", customerType: "Individual" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["customer.create", "customer.create.insert"] }),
      ),
      s.step(
        "a customer put in a group that has groups under it is refused",
        customer({ customerName: "Duka Mart", customerType: "Company", customerGroup: s.world.allCustomerGroups }),
        refuses(CustomerGroupIsGroup),
        noEvents(),
        spans({ absent: ["customer.create.insert"] }),
      ),
      s.step(
        "Ada adds Acme Logistics' root customer group",
        s.ada.run(createCustomerGroup, { company: s.world.otherCompany, customerGroupName: "All Customer Groups", isGroup: true }),
        expect((a) => a.customerGroup).toMatch(/^cgr_/),
      ),
      s.step(
        "an Acme Trading customer in it is refused for its company before its being a group",
        customer({ customerName: "Duka Mart", customerType: "Company", customerGroup: s.last.customerGroup }),
        refuses(CustomerGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "an Acme Logistics customer in Acme Trading's Commercial is refused",
        customer({ customerName: "Gulu Traders", customerType: "Company", customerGroup: s.world.customerGroup }, s.world.otherCompany),
        refuses(CustomerGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada adds Wanjiru Njoroge, an individual in no group",
        customer({ customerName: "Wanjiru Njoroge", customerType: "Individual" }),
        expect((a) => a.customer).toMatch(/^cus_[0-9a-z]+$/),
        emits(CustomerCreated, { customer: s.last.customer, company: s.world.company }),
        customers.isIn(s.last.customer, "active"),
        spans({ present: ["customer.create", "customer.create.load", "customer.create.insert"] }),
      ),
      s.step(
        "she reads back as typed, in no group",
        s.ada.run(getCustomer, { id: s.last.customer }),
        expect(readC).toEqual([s.world.company, "Wanjiru Njoroge", "Individual", null, "active"]),
      ),
      s.step(
        "a second Kibo Stores is a customer of its own: two may share a name",
        customer({ customerName: "Kibo Stores", customerType: "Partnership", customerGroup: s.world.customerGroup }),
        expect((a) => a.customer === s.world.customer).toBe(false),
        customers.isIn(s.last.customer, "active"),
      ),
      s.step(
        "it reads back as a partnership",
        s.ada.run(getCustomer, { id: s.last.customer }),
        expect(readC).toEqual([s.world.company, "Kibo Stores", "Partnership", s.world.customerGroup, "active"]),
      ),
      s.step(
        "a new customer's balance is nothing",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        expect(sums).toEqual([0n, 0n, 0n]),
        expect((a) => a.customer).toBe(s.world.customer),
        noEvents(),
        spans({ present: ["customer.balance", "customer.balance.sum"] }),
      ),
      s.step(
        "Bo can't read it",
        s.bo.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["customer.balance.sum"] }),
      ),
      s.step("nor disable Kibo Stores", s.bo.run(disableCustomer, { customer: s.world.customer }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Kibo Stores can't be enabled while active",
        s.ada.run(enableCustomer, { customer: s.world.customer }),
        refuses(customers.notFrom, { state: "active" }),
        noEvents(),
      ),
      s.step(
        "Ada disables it",
        s.ada.run(disableCustomer, { customer: s.world.customer }),
        expect((a) => a.customer).toBe(s.world.customer),
        emits(CustomerDisabled, { customer: s.world.customer }),
        customers.isIn(s.world.customer, "disabled"),
        spans({ present: ["customer.disable", "customer.disable.update"] }),
      ),
      s.step(
        "it reads back disabled, with the rest as it was",
        s.ada.run(getCustomer, { id: s.world.customer }),
        expect(readC).toEqual([s.world.company, "Kibo Stores", "Company", s.world.customerGroup, "disabled"]),
      ),
      s.step(
        "it can't be disabled twice",
        s.ada.run(disableCustomer, { customer: s.world.customer }),
        refuses(customers.notFrom, { state: "disabled" }),
        noEvents(),
      ),
      s.step("Bo can't enable it", s.bo.run(enableCustomer, { customer: s.world.customer }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada enables it again",
        s.ada.run(enableCustomer, { customer: s.world.customer }),
        emits(CustomerEnabled, { customer: s.world.customer }),
        customers.isIn(s.world.customer, "active"),
      ),
      s.step(
        "Kampala Traders, in Acme Logistics, is still active",
        s.ada.run(getCustomer, { id: s.world.otherCustomer }),
        expect((a) => a.state).toBe("active"),
      ),

      // Suppliers: the same rules.
      s.step(
        "Mara Office Rentals reads back an active company in Services",
        s.ada.run(getSupplier, { id: s.world.supplier }),
        expect(readS).toEqual([s.world.company, "Mara Office Rentals", "Company", s.world.supplierGroup, "active"]),
      ),
      s.step(
        "Nile Fuel reads back in Acme Logistics, in no group",
        s.ada.run(getSupplier, { id: s.world.otherSupplier }),
        expect(readS).toEqual([s.world.otherCompany, "Nile Fuel", "Company", null, "active"]),
      ),
      s.step("Bo can't read Mara Office Rentals", s.bo.run(getSupplier, { id: s.world.supplier }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add a supplier",
        s.bo.run(createSupplier, { company: s.world.company, supplierName: "Bo's Vans", supplierType: "Individual" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "a supplier in All Supplier Groups is refused: it is a group",
        supplier({ supplierName: "Rift Paper", supplierType: "Company", supplierGroup: s.world.allSupplierGroups }),
        refuses(SupplierGroupIsGroup),
        noEvents(),
      ),
      s.step(
        "Ada adds Acme Logistics' root supplier group",
        s.ada.run(createSupplierGroup, { company: s.world.otherCompany, supplierGroupName: "All Supplier Groups", isGroup: true }),
        expect((a) => a.supplierGroup).toMatch(/^sgr_/),
      ),
      s.step(
        "an Acme Trading supplier in it is refused for its company first",
        supplier({ supplierName: "Rift Paper", supplierType: "Company", supplierGroup: s.last.supplierGroup }),
        refuses(SupplierGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "an Acme Logistics supplier in Acme Trading's Services is refused",
        supplier({ supplierName: "Jinja Tyres", supplierType: "Company", supplierGroup: s.world.supplierGroup }, s.world.otherCompany),
        refuses(SupplierGroupNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada adds Otieno Plumbing, a partnership in no group",
        supplier({ supplierName: "Otieno Plumbing", supplierType: "Partnership" }),
        expect((a) => a.supplier).toMatch(/^sup_[0-9a-z]+$/),
        emits(SupplierCreated, { supplier: s.last.supplier, company: s.world.company }),
        suppliers.isIn(s.last.supplier, "active"),
        spans({ present: ["supplier.create", "supplier.create.load", "supplier.create.insert"] }),
      ),
      s.step(
        "it reads back as typed",
        s.ada.run(getSupplier, { id: s.last.supplier }),
        expect(readS).toEqual([s.world.company, "Otieno Plumbing", "Partnership", null, "active"]),
      ),
      s.step(
        "a second Mara Office Rentals is a supplier of its own",
        supplier({ supplierName: "Mara Office Rentals", supplierType: "Individual", supplierGroup: s.world.supplierGroup }),
        expect((a) => a.supplier === s.world.supplier).toBe(false),
      ),
      s.step(
        "a new supplier's balance is nothing",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([0n, 0n, 0n]),
        expect((a) => a.supplier).toBe(s.world.supplier),
        spans({ present: ["supplier.balance", "supplier.balance.sum"] }),
      ),
      s.step("Bo can't read it", s.bo.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Mara Office Rentals can't be enabled while active",
        s.ada.run(enableSupplier, { supplier: s.world.supplier }),
        refuses(suppliers.notFrom, { state: "active" }),
        noEvents(),
      ),
      s.step("Bo can't disable it", s.bo.run(disableSupplier, { supplier: s.world.supplier }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada disables it",
        s.ada.run(disableSupplier, { supplier: s.world.supplier }),
        emits(SupplierDisabled, { supplier: s.world.supplier }),
        suppliers.isIn(s.world.supplier, "disabled"),
        spans({ present: ["supplier.disable", "supplier.disable.update"] }),
      ),
      s.step(
        "it reads back disabled",
        s.ada.run(getSupplier, { id: s.world.supplier }),
        expect(readS).toEqual([s.world.company, "Mara Office Rentals", "Company", s.world.supplierGroup, "disabled"]),
      ),
      s.step(
        "it can't be disabled twice",
        s.ada.run(disableSupplier, { supplier: s.world.supplier }),
        refuses(suppliers.notFrom, { state: "disabled" }),
        noEvents(),
      ),
      s.step(
        "Ada enables it again",
        s.ada.run(enableSupplier, { supplier: s.world.supplier }),
        expect((a) => a.supplier).toBe(s.world.supplier),
        emits(SupplierEnabled, { supplier: s.world.supplier }),
        suppliers.isIn(s.world.supplier, "active"),
      ),
      s.step(
        "and it can't be enabled twice",
        s.ada.run(enableSupplier, { supplier: s.world.supplier }),
        refuses(suppliers.notFrom, { state: "active" }),
        noEvents(),
      ),
    ];
  },
});
