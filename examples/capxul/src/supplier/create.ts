// Scaffolded from blueprint/things/supplier/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/supplier/create.handler.ts";

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
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span supplier.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // SupplierGroupNotInCompany: exit 41, SU-001.
    if (yield* Handlers.blank<boolean>("refuse SupplierGroupNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SupplierGroupNotInCompany was refused"));
      return yield* new SupplierGroupNotInCompany({});
    }

    // SupplierGroupIsGroup: exit 42, SU-002.
    if (yield* Handlers.blank<boolean>("refuse SupplierGroupIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SupplierGroupIsGroup was refused"));
      return yield* new SupplierGroupIsGroup({});
    }

    // Step insert: database, span supplier.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // SupplierCreated needs supplier, and only the answer can give it.
      supplier: id,
    };
  });

export default create;
