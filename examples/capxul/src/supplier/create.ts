// Scaffolded from blueprint/things/supplier/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/supplier/create.handler.ts";
import { Supplier } from "../../blueprint/things/supplier/thing.ts";

const { SupplierGroupNotInCompany, SupplierGroupIsGroup } = Errors.declared;

/**
 * supplier.create: Add a supplier to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/supplier/verbs/create.ts:
 *   company        supplier.company
 *   supplierName   supplier.supplierName
 *   supplierType   supplier.supplierType
 *   supplierGroup  supplier.supplierGroup (optional)
 *
 * Answer, from blueprint/things/supplier/verbs/create.ts:
 *   supplier  supplier.id
 *
 * Refusals:
 *   SupplierGroupNotInCompany  exit 41   SU-001  yours to refuse below; from blueprint/things/supplier/errors.ts
 *   SupplierGroupIsGroup       exit 42   SU-002  yours to refuse below; from blueprint/things/supplier/errors.ts
 *   SupplierGroupNotFound      exit 4    SG-901  the runtime's, when no supplier-group has that id, carrying id; from blueprint/things/supplier-group/thing.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/supplier/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/supplier/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/supplier/verbs/create.ts: p95 150ms.
 *
 * The supplier's machine, from blueprint/things/supplier/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  create   active    SupplierCreated
 *     active     disable  disabled  SupplierDisabled
 *     disabled   enable   active    SupplierEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the supplierGroup and hands it in as refs.supplierGroup, refusing SupplierGroupNotFound if there is none;
 *   before it runs, it mints the supplier's new id and hands it in as id;
 *   each step is its own span: supplier.create.load, supplier.create.insert;
 *   once it answers, it sets the supplier's state to active;
 *   once it answers, it writes SupplierCreated: supplier from the answer, company from the payload;
 *   the call is the span supplier.create, and its commit supplier.create.commit.
 */
const create: Handler = ({ company, supplierName, supplierType, supplierGroup }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span supplier.create.load. The runtime read the group, when one is named, and hands it in.
    const group = yield* steps.load(Effect.succeed(refs.supplierGroup));

    // Refusal order (errors.ts): SupplierGroupNotInCompany, then SupplierGroupIsGroup. A group is optional; given, it is
    // the company's and a ledger, whether a root or a group below it (ERPNext's validate on the party's group).
    if (supplierGroup !== undefined) {
      // SupplierGroupNotInCompany: exit 41. Judged first, so nothing is said about another company's group.
      if (!group || group["company"] !== company) {
        yield* Effect.logInfo("the group belongs to another company");
        return yield* new SupplierGroupNotInCompany({});
      }

      // SupplierGroupIsGroup: exit 42. A party goes in a ledger group, not one that holds other groups.
      if (group.state === "group") {
        yield* Effect.logInfo("the group holds other groups, not parties");
        return yield* new SupplierGroupIsGroup({});
      }
    }

    // Step insert: database, span supplier.create.insert. Two parties may share a name (ERPNext names them by a naming
    // series). A group not given is left out and stored empty.
    yield* steps.insert(
      records.insert(Supplier, {
        id,
        company,
        supplierName,
        supplierType,
        ...(supplierGroup !== undefined ? { supplierGroup } : {}),
      }),
    );

    // The move create, to active.
    yield* move();

    return {
      // SupplierCreated needs supplier, and only the answer can give it.
      supplier: id,
    };
  });

export default create;
