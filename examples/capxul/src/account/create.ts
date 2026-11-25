// Scaffolded from blueprint/things/account/verbs/create.ts. Yours from now on.
import { Effect, Match } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/account/create.handler.ts";

const { ParentAccountNotInCompany, ParentAccountIsLedger, RootAccountIsLedger, RootTypeMissing, RootTypeNotParents } = Errors.declared;

/**
 * account.create: Add an account to a company's chart, under a group or as a root.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/account/verbs/create.ts:
 *   company        account.company
 *   accountName    account.accountName
 *   parentAccount  account.parentAccount (optional)
 *   isGroup        schema
 *   rootType       account.rootType (optional)
 *   accountType    account.accountType (optional)
 *
 * Answer, from blueprint/things/account/verbs/create.ts:
 *   account     account.id
 *   rootType    account.rootType
 *   reportType  account.reportType
 *
 * Refusals:
 *   ParentAccountNotInCompany  exit 41   AC-001  yours to refuse below; from blueprint/things/account/errors.ts
 *   ParentAccountIsLedger      exit 42   AC-002  yours to refuse below; from blueprint/things/account/errors.ts
 *   RootAccountIsLedger        exit 43   AC-003  yours to refuse below; from blueprint/things/account/errors.ts
 *   RootTypeMissing            exit 44   AC-004  yours to refuse below; from blueprint/things/account/errors.ts
 *   RootTypeNotParents         exit 45   AC-005  yours to refuse below, carrying rootType; from blueprint/things/account/errors.ts
 *   AccountNameTaken           exit 47   AC-007  the runtime's: another account holds this company and account name (account.oneNamePerCompany); from blueprint/things/account/invariants.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/account/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/account/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/account/verbs/create.ts: p95 150ms.
 *
 * The account's machine, from blueprint/things/account/machine.ts (▶ marks this call):
 *     from       move        to      emits
 *   ▶ (creates)  create      group   AccountCreated
 *   ▶ (creates)  create      ledger  AccountCreated
 *     group      makeLedger  ledger  AccountMadeLedger
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the parentAccount and hands it in as refs.parentAccount;
 *   before it runs, it mints the account's new id and hands it in as id;
 *   each step is its own span: account.create.load, account.create.insert;
 *   once it answers, it sets the account's state to the outcome given to move;
 *   once it answers, it writes AccountCreated: account and rootType from the answer, company from the payload;
 *   the call is the span account.create, and its commit account.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span account.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // ParentAccountNotInCompany: exit 41, AC-001.
    if (yield* Handlers.blank<boolean>("refuse ParentAccountNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ParentAccountNotInCompany was refused"));
      return yield* new ParentAccountNotInCompany({});
    }

    // ParentAccountIsLedger: exit 42, AC-002.
    if (yield* Handlers.blank<boolean>("refuse ParentAccountIsLedger when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ParentAccountIsLedger was refused"));
      return yield* new ParentAccountIsLedger({});
    }

    // RootAccountIsLedger: exit 43, AC-003.
    if (yield* Handlers.blank<boolean>("refuse RootAccountIsLedger when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RootAccountIsLedger was refused"));
      return yield* new RootAccountIsLedger({});
    }

    // RootTypeMissing: exit 44, AC-004.
    if (yield* Handlers.blank<boolean>("refuse RootTypeMissing when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RootTypeMissing was refused"));
      return yield* new RootTypeMissing({});
    }

    // RootTypeNotParents: exit 45, AC-005.
    if (yield* Handlers.blank<boolean>("refuse RootTypeNotParents when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RootTypeNotParents was refused"));
      return yield* new RootTypeNotParents({
        rootType: yield* Handlers.blank("RootTypeNotParents.rootType, a RootType"),
      });
    }

    // Step insert: database, span account.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome = yield* Handlers.blank<Outcome>("where create ends: group or ledger");
    yield* Match.value(outcome).pipe(
      // To group. From there the account can: makeLedger (to ledger).
      Match.when("group", () => move("group")),
      // To ledger. From there the account can: nothing more.
      Match.when("ledger", () => move("ledger")),
      Match.exhaustive,
    );

    return {
      // AccountCreated needs account, and only the answer can give it.
      account: id,
      rootType: yield* Handlers.blank("rootType, an account.rootType"),
      reportType: yield* Handlers.blank("reportType, an account.reportType"),
    };
  });

export default create;
