// Scaffolded from blueprint/things/leave-type/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { LeaveType } from "../../blueprint/things/leave-type/thing.ts";
import type { Handler } from "../../generated/api/src/leave-type/create.handler.ts";

/**
 * leave-type.create: Add a kind of leave a company gives.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-type/verbs/create.ts:
 *   company                   leave-type.company
 *   leaveTypeName             leave-type.leaveTypeName
 *   maxContinuousDaysAllowed  leave-type.maxContinuousDaysAllowed
 *   isLwp                     leave-type.isLwp
 *   includeHoliday            leave-type.includeHoliday
 *
 * Answer, from blueprint/things/leave-type/verbs/create.ts:
 *   leaveType  leave-type.id
 *
 * Refusals:
 *   LeaveTypeNameTaken   exit 41   LT-001  the runtime's: another leave type holds this company and leave type name (leave-type.oneNamePerCompany); from blueprint/things/leave-type/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-type/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/leave-type/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-type/verbs/create.ts: p95 150ms.
 *
 * The leave-type's machine, from blueprint/things/leave-type/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  LeaveTypeCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the leave-type's new id and hands it in as id;
 *   each step is its own span: leave-type.create.insert;
 *   once it answers, it sets the leave-type's state to active;
 *   once it answers, it writes LeaveTypeCreated: leaveType from the answer, company from the payload;
 *   the call is the span leave-type.create, and its commit leave-type.create.commit.
 */
const create: Handler = ({ company, leaveTypeName, maxContinuousDaysAllowed, isLwp, includeHoliday }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step insert: database, span leave-type.create.insert. A name the company holds already is the runtime's refusal
    // (leave-type.oneNamePerCompany).
    yield* steps.insert(records.insert(LeaveType, { id, company, leaveTypeName, maxContinuousDaysAllowed, isLwp, includeHoliday }));

    // The move create, to active.
    yield* move();

    return {
      // LeaveTypeCreated needs leaveType, and only the answer can give it.
      leaveType: id,
    };
  });

export default create;
