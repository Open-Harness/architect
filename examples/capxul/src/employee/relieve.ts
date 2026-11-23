// Scaffolded from blueprint/things/employee/verbs/relieve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
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
const relieve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span employee.relieve.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // RelievedBeforeJoined: exit 45, EM-005.
    if (yield* Handlers.blank<boolean>("refuse RelievedBeforeJoined when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RelievedBeforeJoined was refused"));
      return yield* new RelievedBeforeJoined({
        dateOfJoining: yield* Handlers.blank("RelievedBeforeJoined.dateOfJoining, a Day"),
      });
    }

    // Step update: database, span employee.relieve.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move relieve, from active, to left.
    yield* move();

    return {
      employee: yield* Handlers.blank("employee, an employee.id"),
      relievingDate: yield* Handlers.blank("relievingDate, a Day"),
    };
  });

export default relieve;
