// Scaffolded from blueprint/things/cost-center/verbs/create.ts. Yours from now on.
import { Effect, Match } from "effect";
import type { InstanceOf } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/cost-center/create.handler.ts";
import { CostCenter } from "../../blueprint/things/cost-center/thing.ts";

const { ParentCostCenterNotInCompany, ParentCostCenterIsLedger, RootCostCenterIsLedger } = Errors.declared;

/**
 * cost-center.create: Add a cost center to a company, under a group or as a root.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/cost-center/verbs/create.ts:
 *   company           cost-center.company
 *   costCenterName    cost-center.costCenterName
 *   parentCostCenter  cost-center.parentCostCenter (optional)
 *   isGroup           schema
 *
 * Answer, from blueprint/things/cost-center/verbs/create.ts:
 *   costCenter  cost-center.id
 *
 * Refusals:
 *   ParentCostCenterNotInCompany  exit 41   CC-001  yours to refuse below; from blueprint/things/cost-center/errors.ts
 *   ParentCostCenterIsLedger      exit 42   CC-002  yours to refuse below; from blueprint/things/cost-center/errors.ts
 *   RootCostCenterIsLedger        exit 43   CC-003  yours to refuse below; from blueprint/things/cost-center/errors.ts
 *   CostCenterNameTaken           exit 44   CC-004  the runtime's: another cost center holds this company and cost center name (cost-center.oneNamePerCompany); from blueprint/things/cost-center/invariants.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/cost-center/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/cost-center/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/cost-center/verbs/create.ts: p95 150ms.
 *
 * The cost-center's machine, from blueprint/things/cost-center/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  group   CostCenterCreated
 *   ▶ (creates)  create  ledger  CostCenterCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the parentCostCenter and hands it in as refs.parentCostCenter;
 *   before it runs, it mints the cost-center's new id and hands it in as id;
 *   each step is its own span: cost-center.create.load, cost-center.create.insert;
 *   once it answers, it sets the cost-center's state to the outcome given to move;
 *   once it answers, it writes CostCenterCreated: costCenter from the answer, company from the payload;
 *   the call is the span cost-center.create, and its commit cost-center.create.commit.
 */
const create: Handler = ({ company, costCenterName, parentCostCenter, isGroup }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span cost-center.create.load. The runtime read the parent, when one is named, and hands it in.
    const parent = yield* steps.load(Effect.succeed(refs.parentCostCenter));

    // Refusal order (errors.ts): ParentCostCenterNotInCompany, ParentCostCenterIsLedger, RootCostCenterIsLedger.
    if (parentCostCenter !== undefined) {
      // ParentCostCenterNotInCompany: exit 41, CC-001. A parent that isn't there is no cost center of this company's.
      if (!parent || parent["company"] !== company) {
        yield* Effect.logInfo("the parent cost center belongs to another company");
        return yield* new ParentCostCenterNotInCompany({});
      }

      // ParentCostCenterIsLedger: exit 42, CC-002.
      if (parent.state !== "group") {
        yield* Effect.logInfo("the parent cost center is a ledger, not a group");
        return yield* new ParentCostCenterIsLedger({});
      }
    } else if (!isGroup) {
      // RootCostCenterIsLedger: exit 43, CC-003.
      yield* Effect.logInfo("a root cost center must be a group");
      return yield* new RootCostCenterIsLedger({});
    }

    // Step insert: database, span cost-center.create.insert. A name already used is the runtime's refusal
    // (oneNamePerCompany). A root's parent is left out and stored empty; the cast is only because `InstanceOf` types
    // every field as required.
    yield* steps.insert(
      records.insert(CostCenter, {
        id,
        company,
        costCenterName,
        ...(parentCostCenter !== undefined ? { parentCostCenter } : {}),
      } as Omit<InstanceOf<typeof CostCenter>, "state">),
    );

    // The move create: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome: Outcome = isGroup ? "group" : "ledger";
    yield* Match.value(outcome).pipe(
      // To group. From there the cost-center can: nothing more.
      Match.when("group", () => move("group")),
      // To ledger. From there the cost-center can: nothing more.
      Match.when("ledger", () => move("ledger")),
      Match.exhaustive,
    );

    return {
      // CostCenterCreated needs costCenter, and only the answer can give it.
      costCenter: id,
    };
  });

export default create;
