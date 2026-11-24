// Scaffolded from blueprint/things/branch/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/branch/create.handler.ts";

/**
 * branch.create: Add a branch to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/branch/verbs/create.ts:
 *   company     branch.company
 *   branchName  branch.branchName
 *
 * Answer, from blueprint/things/branch/verbs/create.ts:
 *   branch  branch.id
 *
 * Refusals:
 *   BranchNameTaken      exit 41   BR-001  the runtime's: another branch holds this company and branch name (branch.oneNamePerCompany); from blueprint/things/branch/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/branch/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/branch/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/branch/verbs/create.ts: p95 150ms.
 *
 * The branch's machine, from blueprint/things/branch/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  BranchCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the branch's new id and hands it in as id;
 *   each step is its own span: branch.create.insert;
 *   once it answers, it sets the branch's state to active;
 *   once it answers, it writes BranchCreated: branch from the answer, company from the payload;
 *   the call is the span branch.create, and its commit branch.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span branch.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // BranchCreated needs branch, and only the answer can give it.
      branch: id,
    };
  });

export default create;
