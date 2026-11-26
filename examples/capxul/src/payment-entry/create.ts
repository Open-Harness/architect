// Scaffolded from blueprint/things/payment-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payment-entry/create.handler.ts";

const { PaymentAccountNotInCompany, PaymentAccountIsGroup, PaymentCostCenterNotInCompany, PaymentCostCenterIsGroup, PartyAccountWrongType, PartyNotFound, PartyNotInCompany, PaidAmountZero } = Errors.declared;

/**
 * payment-entry.create: Draft a payment received from a party or paid to one, with no invoice: an advance.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payment-entry/verbs/create.ts:
 *   company      payment-entry.company
 *   paymentType  payment-entry.paymentType
 *   postingDate  payment-entry.postingDate
 *   partyType    payment-entry.partyType
 *   party        payment-entry.party
 *   paidFrom     payment-entry.paidFrom
 *   paidTo       payment-entry.paidTo
 *   paidAmount   payment-entry.paidAmount
 *   costCenter   payment-entry.costCenter
 *
 * Answer, from blueprint/things/payment-entry/verbs/create.ts:
 *   paymentEntry  payment-entry.id
 *
 * Refusals:
 *   PaymentAccountNotInCompany     exit 41   PY-001  yours to refuse below, carrying side; from blueprint/things/payment-entry/errors.ts
 *   PaymentAccountIsGroup          exit 42   PY-002  yours to refuse below, carrying side; from blueprint/things/payment-entry/errors.ts
 *   PaymentCostCenterNotInCompany  exit 43   PY-003  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PaymentCostCenterIsGroup       exit 44   PY-004  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PartyAccountWrongType          exit 45   PY-005  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PartyNotFound                  exit 46   PY-006  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PartyNotInCompany              exit 47   PY-007  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PaidAmountZero                 exit 48   PY-008  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   AccountNotFound                exit 4    AC-901  the runtime's, when no account has that id, carrying id; from blueprint/things/account/thing.ts
 *   CostCenterNotFound             exit 4    CC-901  the runtime's, when no cost-center has that id, carrying id; from blueprint/things/cost-center/thing.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payment-entry/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/payment-entry/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payment-entry/verbs/create.ts: p95 200ms.
 *
 * The payment-entry's machine, from blueprint/things/payment-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      PaymentEntryDrafted
 *     draft      submit  submitted  PaymentEntrySubmitted
 *     submitted  cancel  cancelled  PaymentEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the paidFrom and hands it in as refs.paidFrom, refusing AccountNotFound if there is none;
 *   before it runs, it reads the paidTo and hands it in as refs.paidTo, refusing AccountNotFound if there is none;
 *   before it runs, it reads the costCenter and hands it in as refs.costCenter, refusing CostCenterNotFound if there is none;
 *   before it runs, it mints the payment-entry's new id and hands it in as id;
 *   each step is its own span: payment-entry.create.load, payment-entry.create.insert;
 *   once it answers, it sets the payment-entry's state to draft;
 *   once it answers, it writes PaymentEntryDrafted: paymentEntry from the answer, company, paymentType, partyType, party and paidAmount from the payload;
 *   the call is the span payment-entry.create, and its commit payment-entry.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span payment-entry.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // PaymentAccountNotInCompany: exit 41, PY-001.
    if (yield* Handlers.blank<boolean>("refuse PaymentAccountNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaymentAccountNotInCompany was refused"));
      return yield* new PaymentAccountNotInCompany({
        side: yield* Handlers.blank("PaymentAccountNotInCompany.side, a PaymentSide"),
      });
    }

    // PaymentAccountIsGroup: exit 42, PY-002.
    if (yield* Handlers.blank<boolean>("refuse PaymentAccountIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaymentAccountIsGroup was refused"));
      return yield* new PaymentAccountIsGroup({
        side: yield* Handlers.blank("PaymentAccountIsGroup.side, a PaymentSide"),
      });
    }

    // PaymentCostCenterNotInCompany: exit 43, PY-003.
    if (yield* Handlers.blank<boolean>("refuse PaymentCostCenterNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaymentCostCenterNotInCompany was refused"));
      return yield* new PaymentCostCenterNotInCompany({});
    }

    // PaymentCostCenterIsGroup: exit 44, PY-004.
    if (yield* Handlers.blank<boolean>("refuse PaymentCostCenterIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaymentCostCenterIsGroup was refused"));
      return yield* new PaymentCostCenterIsGroup({});
    }

    // PartyAccountWrongType: exit 45, PY-005.
    if (yield* Handlers.blank<boolean>("refuse PartyAccountWrongType when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PartyAccountWrongType was refused"));
      return yield* new PartyAccountWrongType({});
    }

    // PartyNotFound: exit 46, PY-006.
    if (yield* Handlers.blank<boolean>("refuse PartyNotFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PartyNotFound was refused"));
      return yield* new PartyNotFound({});
    }

    // PartyNotInCompany: exit 47, PY-007.
    if (yield* Handlers.blank<boolean>("refuse PartyNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PartyNotInCompany was refused"));
      return yield* new PartyNotInCompany({});
    }

    // PaidAmountZero: exit 48, PY-008.
    if (yield* Handlers.blank<boolean>("refuse PaidAmountZero when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaidAmountZero was refused"));
      return yield* new PaidAmountZero({});
    }

    // Step insert: database, span payment-entry.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // PaymentEntryDrafted needs paymentEntry, and only the answer can give it.
      paymentEntry: id,
    };
  });

export default create;
