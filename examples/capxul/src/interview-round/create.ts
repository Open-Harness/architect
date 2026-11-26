// Scaffolded from blueprint/things/interview-round/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/interview-round/create.handler.ts";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { InterviewRound } from "../../blueprint/things/interview-round/thing.ts";

const { RoundInterviewerNotInCompany, RoundInterviewerHasLeft } = Errors.declared;

/**
 * interview-round.create: Add a stage of hiring to a company, with the employees who interview at it.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/interview-round/verbs/create.ts:
 *   company       interview-round.company
 *   roundName     interview-round.roundName
 *   interviewers  interview-round.interviewers
 *
 * Answer, from blueprint/things/interview-round/verbs/create.ts:
 *   interviewRound  interview-round.id
 *
 * Refusals:
 *   RoundInterviewerNotInCompany  exit 42   IR-002  yours to refuse below; from blueprint/things/interview-round/errors.ts
 *   RoundInterviewerHasLeft       exit 43   IR-003  yours to refuse below; from blueprint/things/interview-round/errors.ts
 *   RoundNameTaken                exit 41   IR-001  the runtime's: another interview round holds this company and round name (interview-round.oneNamePerCompany); from blueprint/things/interview-round/invariants.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/interview-round/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/interview-round/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/interview-round/verbs/create.ts: p95 150ms.
 *
 * The interview-round's machine, from blueprint/things/interview-round/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  InterviewRoundCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the interview-round's new id and hands it in as id;
 *   each step is its own span: interview-round.create.load, interview-round.create.insert;
 *   once it answers, it sets the interview-round's state to active;
 *   once it answers, it writes InterviewRoundCreated: interviewRound from the answer, company from the payload;
 *   the call is the span interview-round.create, and its commit interview-round.create.commit.
 */
const create: Handler = ({ company, roundName, interviewers }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span interview-round.create.load. Every interviewer named, in the order given; one that
    // isn't found is undefined.
    const found = yield* steps.load(Effect.forEach(interviewers, (employee) => records.find(Employee, employee)));

    // Refusal order (errors.ts): the company check over every interviewer, then the leaver check over every one,
    // wherever each stands in the list.
    // RoundInterviewerNotInCompany: exit 42, IR-002. An employee that isn't found works for no company here.
    if (found.some((employee) => employee?.["company"] !== company)) {
      yield* Effect.logInfo("an interviewer works for another company");
      return yield* new RoundInterviewerNotInCompany({});
    }

    // RoundInterviewerHasLeft: exit 43, IR-003. A leaver isn't put on a new round (CX-expense-leavers).
    if (found.some((employee) => employee?.state !== "active")) {
      yield* Effect.logInfo("an interviewer has left the company");
      return yield* new RoundInterviewerHasLeft({});
    }

    // Step insert: database, span interview-round.create.insert. A name the company already has is the runtime's
    // refusal (oneNamePerCompany).
    yield* steps.insert(records.insert(InterviewRound, { id, company, roundName, interviewers }));

    // The move create, to active.
    yield* move();

    return {
      // InterviewRoundCreated needs interviewRound, and only the answer can give it.
      interviewRound: id,
    };
  });

export default create;
