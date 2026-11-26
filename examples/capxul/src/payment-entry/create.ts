// Scaffolded from blueprint/things/payment-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payment-entry/create.handler.ts";
import { PaymentEntry } from "../../blueprint/things/payment-entry/thing.ts";
import { Customer } from "../../blueprint/things/customer/thing.ts";
import { Supplier } from "../../blueprint/things/supplier/thing.ts";

const { PaymentAccountNotInCompany, PaymentAccountIsGroup, PaymentCostCenterNotInCompany, PaymentCostCenterIsGroup, PartyAccountWrongType, PartyNotFound, PartyNotInCompany, PaidAmountZero } = Errors.declared;

/** ERPNext's Party Type fixtures: the account type a party's account must have. */
const accountTypeOf = { Customer: "Receivable", Supplier: "Payable" } as const;

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
const create: Handler = (
  { company, paymentType, postingDate, partyType, party, paidFrom, paidTo, paidAmount, costCenter },
  { steps, move, refs, id },
) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span payment-entry.create.load. The runtime read both accounts and the cost center and hands
    // them in; this step reads the party as a record of its party type, so a `sup_` id named as a Customer isn't found.
    const { paidFromAccount, paidToAccount, center, found } = yield* steps.load(
      Effect.gen(function* () {
        const { paidFrom: paidFromAccount, paidTo: paidToAccount, costCenter: center } = refs;
        if (!paidFromAccount || !paidToAccount || !center) {
          return yield* Effect.die(new Error("the payment's accounts and cost center were checked and then not found"));
        }
        const found = yield* records.find(partyType === "Customer" ? Customer : Supplier, party);
        return { paidFromAccount, paidToAccount, center, found };
      }),
    );
    const accounts = [
      ["Paid From", paidFromAccount],
      ["Paid To", paidToAccount],
    ] as const;

    // Refusal order (errors.ts). First the two accounts, Paid From then Paid To, each the company's and then a ledger,
    // and the cost center the same way (the GL Entry's validate_account_details and validate_cost_center, judged here
    // and first, so no refusal speaks about another company's record).
    for (const [side, account] of accounts) {
      // PaymentAccountNotInCompany: exit 41, carrying the side.
      if (account["company"] !== company) {
        yield* Effect.logInfo(`${side} belongs to another company`);
        return yield* new PaymentAccountNotInCompany({ side });
      }

      // PaymentAccountIsGroup: exit 42, carrying the side.
      if (account.state === "group") {
        yield* Effect.logInfo(`${side} is a group account, which no transaction may use`);
        return yield* new PaymentAccountIsGroup({ side });
      }
    }

    // PaymentCostCenterNotInCompany: exit 43.
    if (center["company"] !== company) {
      yield* Effect.logInfo("the cost center belongs to another company");
      return yield* new PaymentCostCenterNotInCompany({});
    }

    // PaymentCostCenterIsGroup: exit 44.
    if (center.state === "group") {
      yield* Effect.logInfo("the cost center is a group, which no transaction may use");
      return yield* new PaymentCostCenterIsGroup({});
    }

    // Then ERPNext's validate_party_details. PartyAccountWrongType: exit 45. The party's account is Paid From on
    // Receive and Paid To on Pay (setup_party_account_field), and must have its party type's account type, whichever
    // way the money goes.
    const partyAccount = paymentType === "Receive" ? paidFromAccount : paidToAccount;
    if (partyAccount["accountType"] !== accountTypeOf[partyType]) {
      yield* Effect.logInfo(`a ${partyType}'s account must be ${accountTypeOf[partyType]}`);
      return yield* new PartyAccountWrongType({});
    }

    // PartyNotFound: exit 46. The party isn't a record of its party type.
    if (!found) {
      yield* Effect.logInfo(`no ${partyType} has that id`);
      return yield* new PartyNotFound({});
    }

    // PartyNotInCompany: exit 47. Capxul's own: each company's parties are its own.
    if (found["company"] !== company) {
      yield* Effect.logInfo(`the ${partyType} belongs to another company`);
      return yield* new PartyNotInCompany({});
    }

    // PaidAmountZero: exit 48. ERPNext's validate_mandatory, which runs after validate_party_details.
    if (paidAmount === 0n) {
      yield* Effect.logInfo("a payment of nothing");
      return yield* new PaidAmountZero({});
    }

    // Step insert: database, span payment-entry.create.insert. A disabled party may be drafted to; PartyDisabled is
    // judged on submit and cancel, where ERPNext's GL Entry judges it.
    yield* steps.insert(
      records.insert(PaymentEntry, { id, company, paymentType, postingDate, partyType, party, paidFrom, paidTo, paidAmount, costCenter }),
    );

    // The move create, to draft.
    yield* move();

    return {
      // PaymentEntryDrafted needs paymentEntry, and only the answer can give it.
      paymentEntry: id,
    };
  });

export default create;
