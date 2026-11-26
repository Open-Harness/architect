import { Blueprint } from "orthograph";
import { Customer } from "../thing.ts";
import { machine } from "../machine.ts";
import { CustomerGroupIsGroup, CustomerGroupNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). A customer needs no group; given one, it must be a ledger group of the same company.
export default Blueprint.operation(Customer, {
  description: "Add a customer to a company.",
  payload: {
    company: Customer.fields.company,
    customerName: Customer.fields.customerName,
    customerType: Customer.fields.customerType,
    customerGroup: Customer.fields.customerGroup,
  },
  answer: { customer: Customer.fields.id },
  move: machine.moves.create,
  errors: [CustomerGroupNotInCompany, CustomerGroupIsGroup],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
