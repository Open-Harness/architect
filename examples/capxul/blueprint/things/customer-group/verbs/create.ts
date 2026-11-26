import { Blueprint } from "orthograph";
import { CustomerGroup } from "../thing.ts";
import { machine } from "../machine.ts";
import { ParentCustomerGroupIsLedger, ParentCustomerGroupNotInCompany, CustomerGroupRootExists } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). `isGroup` picks the state it is made in.
export default Blueprint.operation(CustomerGroup, {
  description: "Add a customer group to a company, under a group or as its one root.",
  payload: {
    company: CustomerGroup.fields.company,
    customerGroupName: CustomerGroup.fields.customerGroupName,
    parentCustomerGroup: CustomerGroup.fields.parentCustomerGroup,
    isGroup: Blueprint.described(Blueprint.bool(), "Make it a group, which other customer groups sit under, rather than a ledger, which customers are put in."),
  },
  answer: { customerGroup: CustomerGroup.fields.id },
  move: machine.moves.create,
  errors: [ParentCustomerGroupNotInCompany, ParentCustomerGroupIsLedger, CustomerGroupRootExists],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
