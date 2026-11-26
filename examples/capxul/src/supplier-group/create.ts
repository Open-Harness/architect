// Scaffolded from blueprint/things/supplier-group/verbs/create.ts. Yours from now on.
import { Effect, Match } from "effect";
import type { InstanceOf } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/supplier-group/create.handler.ts";
import { SupplierGroup } from "../../blueprint/things/supplier-group/thing.ts";

const { ParentSupplierGroupNotInCompany, ParentSupplierGroupIsLedger, SupplierGroupRootExists } = Errors.declared;

/**
 * supplier-group.create: Add a supplier group to a company, under a group or as its one root.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/supplier-group/verbs/create.ts:
 *   company              supplier-group.company
 *   supplierGroupName    supplier-group.supplierGroupName
 *   parentSupplierGroup  supplier-group.parentSupplierGroup (optional)
 *   isGroup              YesNo
 *
 * Answer, from blueprint/things/supplier-group/verbs/create.ts:
 *   supplierGroup  supplier-group.id
 *
 * Refusals:
 *   ParentSupplierGroupNotInCompany  exit 41   SG-001  yours to refuse below; from blueprint/things/supplier-group/errors.ts
 *   ParentSupplierGroupIsLedger      exit 42   SG-002  yours to refuse below; from blueprint/things/supplier-group/errors.ts
 *   SupplierGroupRootExists          exit 43   SG-003  yours to refuse below, carrying root; from blueprint/things/supplier-group/errors.ts
 *   SupplierGroupNameTaken           exit 44   SG-004  the runtime's: another supplier group holds this company and supplier group name (supplier-group.oneNamePerCompany); from blueprint/things/supplier-group/invariants.ts
 *   NotAllowed                       exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict              exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/supplier-group/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/supplier-group/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/supplier-group/verbs/create.ts: p95 150ms.
 *
 * The supplier-group's machine, from blueprint/things/supplier-group/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  group   SupplierGroupCreated
 *   ▶ (creates)  create  ledger  SupplierGroupCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the parentSupplierGroup and hands it in as refs.parentSupplierGroup;
 *   before it runs, it mints the supplier-group's new id and hands it in as id;
 *   each step is its own span: supplier-group.create.load, supplier-group.create.insert;
 *   once it answers, it sets the supplier-group's state to the outcome given to move;
 *   once it answers, it writes SupplierGroupCreated: supplierGroup from the answer, company from the payload;
 *   the call is the span supplier-group.create, and its commit supplier-group.create.commit.
 */
const create: Handler = ({ company, supplierGroupName, parentSupplierGroup, isGroup }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span supplier-group.create.load. The runtime read the parent, when one is named, and hands it
    // in; a root is judged on the company's groups with no parent (Frappe's validate_one_root). The company's groups
    // count as read at commit, so two roots made at once can't both land (decisions/CX-parties-payments.md).
    const { parent, roots } = yield* steps.load(
      Effect.gen(function* () {
        if (parentSupplierGroup !== undefined) return { parent: refs.parentSupplierGroup, roots: [] };
        const page = yield* records.list({
          thing: SupplierGroup,
          where: { company },
          state: undefined,
          order: "oldest",
          limit: Number.MAX_SAFE_INTEGER,
          after: undefined,
        });
        return { parent: undefined, roots: page.items.filter((g) => !g["parentSupplierGroup"]) };
      }),
    );

    // Refusal order (errors.ts): ParentSupplierGroupNotInCompany, ParentSupplierGroupIsLedger, SupplierGroupRootExists; the
    // name taken twice is the runtime's, after them.
    if (parentSupplierGroup !== undefined) {
      // ParentSupplierGroupNotInCompany: exit 41. Judged first, so nothing is said about another company's group.
      if (!parent || parent["company"] !== company) {
        yield* Effect.logInfo("the parent group belongs to another company");
        return yield* new ParentSupplierGroupNotInCompany({});
      }

      // ParentSupplierGroupIsLedger: exit 42.
      if (parent.state !== "group") {
        yield* Effect.logInfo("the parent group is a ledger, not a group");
        return yield* new ParentSupplierGroupIsLedger({});
      }
    } else {
      // SupplierGroupRootExists: exit 43, carrying the root the company has.
      const root = roots[0];
      if (root) {
        yield* Effect.logInfo("the company already has its root group");
        return yield* new SupplierGroupRootExists({ root: root["id"] as never });
      }
    }

    // Step insert: database, span supplier-group.create.insert. A name already used is the runtime's refusal
    // (oneNamePerCompany). A root's parent is left out and stored empty; the cast is only because `InstanceOf` types
    // every field as required.
    yield* steps.insert(
      records.insert(SupplierGroup, {
        id,
        company,
        supplierGroupName,
        ...(parentSupplierGroup !== undefined ? { parentSupplierGroup } : {}),
      } as Omit<InstanceOf<typeof SupplierGroup>, "state">),
    );

    // The move create: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome: Outcome = isGroup ? "group" : "ledger";
    yield* Match.value(outcome).pipe(
      // To group. From there the supplier-group can: nothing more.
      Match.when("group", () => move("group")),
      // To ledger. From there the supplier-group can: nothing more.
      Match.when("ledger", () => move("ledger")),
      Match.exhaustive,
    );

    return {
      // SupplierGroupCreated needs supplierGroup, and only the answer can give it.
      supplierGroup: id,
    };
  });

export default create;
