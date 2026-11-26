// Scaffolded from blueprint/things/customer/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/customer/create.handler.ts";
import { Customer } from "../../blueprint/things/customer/thing.ts";

const { CustomerGroupNotInCompany, CustomerGroupIsGroup } = Errors.declared;

/**
 * customer.create: Add a customer to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/customer/verbs/create.ts:
 *   company        customer.company
 *   customerName   customer.customerName
 *   customerType   customer.customerType
 *   customerGroup  customer.customerGroup (optional)
 *
 * Answer, from blueprint/things/customer/verbs/create.ts:
 *   customer  customer.id
 *
 * Refusals:
 *   CustomerGroupNotInCompany  exit 41   CU-001  yours to refuse below; from blueprint/things/customer/errors.ts
 *   CustomerGroupIsGroup       exit 42   CU-002  yours to refuse below; from blueprint/things/customer/errors.ts
 *   CustomerGroupNotFound      exit 4    CG-901  the runtime's, when no customer-group has that id, carrying id; from blueprint/things/customer-group/thing.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/customer/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/customer/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/customer/verbs/create.ts: p95 150ms.
 *
 * The customer's machine, from blueprint/things/customer/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  create   active    CustomerCreated
 *     active     disable  disabled  CustomerDisabled
 *     disabled   enable   active    CustomerEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the customerGroup and hands it in as refs.customerGroup, refusing CustomerGroupNotFound if there is none;
 *   before it runs, it mints the customer's new id and hands it in as id;
 *   each step is its own span: customer.create.load, customer.create.insert;
 *   once it answers, it sets the customer's state to active;
 *   once it answers, it writes CustomerCreated: customer from the answer, company from the payload;
 *   the call is the span customer.create, and its commit customer.create.commit.
 */
const create: Handler = ({ company, customerName, customerType, customerGroup }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span customer.create.load. The runtime read the group, when one is named, and hands it in.
    const group = yield* steps.load(Effect.succeed(refs.customerGroup));

    // Refusal order (errors.ts): CustomerGroupNotInCompany, then CustomerGroupIsGroup. A group is optional; given, it is
    // the company's and a ledger, whether a root or a group below it (ERPNext's validate on the party's group).
    if (customerGroup !== undefined) {
      // CustomerGroupNotInCompany: exit 41. Judged first, so nothing is said about another company's group.
      if (!group || group["company"] !== company) {
        yield* Effect.logInfo("the group belongs to another company");
        return yield* new CustomerGroupNotInCompany({});
      }

      // CustomerGroupIsGroup: exit 42. A party goes in a ledger group, not one that holds other groups.
      if (group.state === "group") {
        yield* Effect.logInfo("the group holds other groups, not parties");
        return yield* new CustomerGroupIsGroup({});
      }
    }

    // Step insert: database, span customer.create.insert. Two parties may share a name (ERPNext names them by a naming
    // series). A group not given is left out and stored empty.
    yield* steps.insert(
      records.insert(Customer, {
        id,
        company,
        customerName,
        customerType,
        ...(customerGroup !== undefined ? { customerGroup } : {}),
      }),
    );

    // The move create, to active.
    yield* move();

    return {
      // CustomerCreated needs customer, and only the answer can give it.
      customer: id,
    };
  });

export default create;
