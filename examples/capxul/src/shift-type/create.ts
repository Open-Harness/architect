// Scaffolded from blueprint/things/shift-type/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { ShiftType } from "../../blueprint/things/shift-type/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/shift-type/create.handler.ts";

const { ShiftStartsWhenItEnds } = Errors.declared;

/**
 * shift-type.create: Add a working shift to a company, from its start time to its end time.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/shift-type/verbs/create.ts:
 *   company        shift-type.company
 *   shiftTypeName  shift-type.shiftTypeName
 *   startTime      shift-type.startTime
 *   endTime        shift-type.endTime
 *
 * Answer, from blueprint/things/shift-type/verbs/create.ts:
 *   shiftType  shift-type.id
 *
 * Refusals:
 *   ShiftStartsWhenItEnds  exit 42   SH-002  yours to refuse below; from blueprint/things/shift-type/errors.ts
 *   ShiftTypeNameTaken     exit 41   SH-001  the runtime's: another shift type holds this company and shift type name (shift-type.oneNamePerCompany); from blueprint/things/shift-type/invariants.ts
 *   NotAllowed             exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict    exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/shift-type/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/shift-type/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/shift-type/verbs/create.ts: p95 150ms.
 *
 * The shift-type's machine, from blueprint/things/shift-type/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  ShiftTypeCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the shift-type's new id and hands it in as id;
 *   each step is its own span: shift-type.create.insert;
 *   once it answers, it sets the shift-type's state to active;
 *   once it answers, it writes ShiftTypeCreated: shiftType from the answer, company from the payload;
 *   the call is the span shift-type.create, and its commit shift-type.create.commit.
 */
const create: Handler = ({ company, shiftTypeName, startTime, endTime }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // ShiftStartsWhenItEnds: exit 42, SH-002. HRMS's validate_same_start_and_end. An end before the start is a shift
    // that runs past midnight, which is allowed.
    if (startTime === endTime) {
      yield* Effect.logInfo("the shift starts at the time it ends");
      return yield* new ShiftStartsWhenItEnds({});
    }

    // Step insert: database, span shift-type.create.insert. A name taken in the company is the runtime's refusal.
    yield* steps.insert(records.insert(ShiftType, { id, company, shiftTypeName, startTime, endTime }));

    // The move create, to active.
    yield* move();

    return {
      // ShiftTypeCreated needs shiftType, and only the answer can give it.
      shiftType: id,
    };
  });

export default create;
