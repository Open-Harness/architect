// Scaffolded from blueprint/things/employee/verbs/relieve.ts. Yours from now on.
import { Effect } from "effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee/relieve.handler.ts";

const { RelievedBeforeJoined } = Errors.declared;

/**
 * employee.relieve: Record that an employee has left the company, on the day they were relieved.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employee.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee/verbs/relieve.ts:
 *   employee       employee.id
 *   relievingDate  Day
 *
 * Answer, from blueprint/things/employee/verbs/relieve.ts:
 *   employee       employee.id
 *   relievingDate  Day
 *
 * Refusals:
 *   RelievedBeforeJoined  exit 45   EM-005  yours to refuse below, carrying dateOfJoining; from blueprint/things/employee/errors.ts
 *   EmployeeNotActive     exit 40   EM-900  the runtime's, when the employee isn't in active, carrying state; from blueprint/things/employee/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its employee.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee/verbs/relieve.ts
 *
 * Idempotent by request, from blueprint/things/employee/verbs/relieve.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee/verbs/relieve.ts: p95 150ms.
 *
 * The employee's machine, from blueprint/things/employee/machine.ts (▶ marks this call):
 *     from       move     to      emits
 *     (creates)  hire     active  EmployeeHired
 *   ▶ active     relieve  left    EmployeeRelieved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employee.company;
 *   before it runs, it refuses EmployeeNotActive unless the employee is in active;
 *   before it runs, it hands in the employee it read as subject, so this handler never reads it again;
 *   each step is its own span: employee.relieve.load, employee.relieve.update;
 *   once it answers, it sets the employee's state to left;
 *   once it answers, it writes EmployeeRelieved: employee and relievingDate from the answer;
 *   the call is the span employee.relieve, and its commit employee.relieve.commit.
 */
const relieve: Handler = ({ employee, relievingDate }, { steps, move, subject }) =>
  Effect.gen(function* () {
    // Step load: database, span employee.relieve.load. The runtime read the employee for its role and state checks
    // and hands it in, so this step only takes it.
    const found = yield* steps.load(Effect.succeed(subject));
    if (!found) return yield* Effect.die(new Error(`employee ${employee} was checked and then not found`));
    const dateOfJoining = found["dateOfJoining"] as string;

    // RelievedBeforeJoined: exit 45, EM-005. Days are YYYY-MM-DD, so they compare as text; the same day is allowed.
    if (relievingDate < dateOfJoining) {
      yield* Effect.logInfo("the relieving day is before the joining day");
      return yield* new RelievedBeforeJoined({ dateOfJoining: dateOfJoining as never });
    }

    // Step update: database, span employee.relieve.update. The employee keeps no relieving day of its own yet (it
    // travels on EmployeeRelieved), so the only change is its state, which the runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move relieve, from active, to left.
    yield* move();

    return { employee, relievingDate };
  });

export default relieve;
