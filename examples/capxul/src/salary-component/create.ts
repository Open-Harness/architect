// Scaffolded from blueprint/things/salary-component/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { SalaryComponent } from "../../blueprint/things/salary-component/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-component/create.handler.ts";

const { ComponentAccountNotInCompany, ComponentAccountIsGroup } = Errors.declared;

/**
 * salary-component.create: Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-component/verbs/create.ts:
 *   company          salary-component.company
 *   salaryComponent  salary-component.salaryComponent
 *   type             salary-component.type
 *   amount           salary-component.amount
 *   account          salary-component.account
 *
 * Answer, from blueprint/things/salary-component/verbs/create.ts:
 *   salaryComponent  salary-component.id
 *
 * Refusals:
 *   ComponentAccountNotInCompany  exit 41   SC-001  yours to refuse below; from blueprint/things/salary-component/errors.ts
 *   ComponentAccountIsGroup       exit 42   SC-002  yours to refuse below; from blueprint/things/salary-component/errors.ts
 *   SalaryComponentTaken          exit 43   SC-003  the runtime's: another salary component holds this company and salary component (salary-component.oneNamePerCompany); from blueprint/things/salary-component/invariants.ts
 *   AccountNotFound               exit 4    AC-901  the runtime's, when no account has that id, carrying id; from blueprint/things/account/thing.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-component/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/salary-component/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-component/verbs/create.ts: p95 150ms.
 *
 * The salary-component's machine, from blueprint/things/salary-component/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  SalaryComponentCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the account and hands it in as refs.account, refusing AccountNotFound if there is none;
 *   before it runs, it mints the salary-component's new id and hands it in as id;
 *   each step is its own span: salary-component.create.load, salary-component.create.insert;
 *   once it answers, it sets the salary-component's state to active;
 *   once it answers, it writes SalaryComponentCreated: salaryComponent from the answer, company and type from the payload;
 *   the call is the span salary-component.create, and its commit salary-component.create.commit.
 */
const create: Handler = ({ company, salaryComponent, type, amount, account }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span salary-component.create.load. The runtime read the account and hands it in.
    const ledger = yield* steps.load(Effect.succeed(refs.account));
    if (!ledger) return yield* Effect.die(new Error(`account ${account} was read and then not found`));

    // Refusal order (errors.ts): the account's company, then its kind; the runtime judges the name after these.
    // ComponentAccountNotInCompany: exit 41, SC-001.
    if (ledger["company"] !== company) {
      yield* Effect.logInfo("the component's account belongs to another company");
      return yield* new ComponentAccountNotInCompany({});
    }

    // ComponentAccountIsGroup: exit 42, SC-002.
    if (ledger.state !== "ledger") {
      yield* Effect.logInfo("the component's account is a group");
      return yield* new ComponentAccountIsGroup({});
    }

    // Step insert: database, span salary-component.create.insert.
    yield* steps.insert(records.insert(SalaryComponent, { id, company, salaryComponent, type, amount, account }));

    // The move create, to active.
    yield* move();

    return {
      salaryComponent: id,
    };
  });

export default create;
