// Scaffolded from blueprint/things/customer-group/verbs/create.ts. Yours from now on.
import { Effect, Match } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/customer-group/create.handler.ts";
import { CustomerGroup } from "../../blueprint/things/customer-group/thing.ts";

const { ParentCustomerGroupNotInCompany, ParentCustomerGroupIsLedger, CustomerGroupRootExists } = Errors.declared;

/**
 * customer-group.create: Add a customer group to a company, under a group or as its one root.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/customer-group/verbs/create.ts:
 *   company              customer-group.company
 *   customerGroupName    customer-group.customerGroupName
 *   parentCustomerGroup  customer-group.parentCustomerGroup (optional)
 *   isGroup              YesNo
 *
 * Answer, from blueprint/things/customer-group/verbs/create.ts:
 *   customerGroup  customer-group.id
 *
 * Refusals:
 *   ParentCustomerGroupNotInCompany  exit 41   CG-001  yours to refuse below; from blueprint/things/customer-group/errors.ts
 *   ParentCustomerGroupIsLedger      exit 42   CG-002  yours to refuse below; from blueprint/things/customer-group/errors.ts
 *   CustomerGroupRootExists          exit 43   CG-003  yours to refuse below, carrying root; from blueprint/things/customer-group/errors.ts
 *   CustomerGroupNameTaken           exit 44   CG-004  the runtime's: another customer group holds this company and customer group name (customer-group.oneNamePerCompany); from blueprint/things/customer-group/invariants.ts
 *   NotAllowed                       exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict              exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/customer-group/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/customer-group/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/customer-group/verbs/create.ts: p95 150ms.
 *
 * The customer-group's machine, from blueprint/things/customer-group/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  group   CustomerGroupCreated
 *   ▶ (creates)  create  ledger  CustomerGroupCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the parentCustomerGroup and hands it in as refs.parentCustomerGroup;
 *   before it runs, it mints the customer-group's new id and hands it in as id;
 *   each step is its own span: customer-group.create.load, customer-group.create.insert;
 *   once it answers, it sets the customer-group's state to the outcome given to move;
 *   once it answers, it writes CustomerGroupCreated: customerGroup from the answer, company from the payload;
 *   the call is the span customer-group.create, and its commit customer-group.create.commit.
 */
const create: Handler = ({ company, customerGroupName, parentCustomerGroup, isGroup }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span customer-group.create.load. The runtime read the parent, when one is named, and hands it
    // in; a root is judged on the company's groups with no parent (Frappe's validate_one_root). The company's groups
    // count as read at commit, so two roots made at once can't both land (decisions/CX-parties-payments.md).
    const { parent, roots } = yield* steps.load(
      Effect.gen(function* () {
        if (parentCustomerGroup !== undefined) return { parent: refs.parentCustomerGroup, roots: [] };
        const page = yield* records.list({
          thing: CustomerGroup,
          where: { company },
          state: undefined,
          order: "oldest",
          limit: Number.MAX_SAFE_INTEGER,
          after: undefined,
        });
        return { parent: undefined, roots: page.items.filter((g) => !g["parentCustomerGroup"]) };
      }),
    );

    // Refusal order (errors.ts): ParentCustomerGroupNotInCompany, ParentCustomerGroupIsLedger, CustomerGroupRootExists; the
    // name taken twice is the runtime's, after them.
    if (parentCustomerGroup !== undefined) {
      // ParentCustomerGroupNotInCompany: exit 41. Judged first, so nothing is said about another company's group.
      if (!parent || parent["company"] !== company) {
        yield* Effect.logInfo("the parent group belongs to another company");
        return yield* new ParentCustomerGroupNotInCompany({});
      }

      // ParentCustomerGroupIsLedger: exit 42.
      if (parent.state !== "group") {
        yield* Effect.logInfo("the parent group is a ledger, not a group");
        return yield* new ParentCustomerGroupIsLedger({});
      }
    } else {
      // CustomerGroupRootExists: exit 43, carrying the root the company has.
      const root = roots[0];
      if (root) {
        yield* Effect.logInfo("the company already has its root group");
        return yield* new CustomerGroupRootExists({ root: root["id"] as never });
      }
    }

    // Step insert: database, span customer-group.create.insert. A name already used is the runtime's refusal
    // (oneNamePerCompany). A root's parent is left out and stored empty.
    yield* steps.insert(
      records.insert(CustomerGroup, {
        id,
        company,
        customerGroupName,
        ...(parentCustomerGroup !== undefined ? { parentCustomerGroup } : {}),
      }),
    );

    // The move create: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome: Outcome = isGroup ? "group" : "ledger";
    yield* Match.value(outcome).pipe(
      // To group. From there the customer-group can: nothing more.
      Match.when("group", () => move("group")),
      // To ledger. From there the customer-group can: nothing more.
      Match.when("ledger", () => move("ledger")),
      Match.exhaustive,
    );

    return {
      // CustomerGroupCreated needs customerGroup, and only the answer can give it.
      customerGroup: id,
    };
  });

export default create;
