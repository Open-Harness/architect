import { Blueprint } from "orthograph";
import { PaymentEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  PaidAmountZero,
  PartyAccountWrongType,
  PartyNotFound,
  PartyNotInCompany,
  PaymentAccountIsGroup,
  PaymentAccountNotInCompany,
  PaymentCostCenterIsGroup,
  PaymentCostCenterNotInCompany,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). It writes the draft only; nothing is posted until it is submitted.
export default Blueprint.operation(PaymentEntry, {
  description: "Draft a payment received from a party or paid to one, with no invoice: an advance.",
  payload: {
    company: PaymentEntry.fields.company,
    paymentType: PaymentEntry.fields.paymentType,
    postingDate: PaymentEntry.fields.postingDate,
    partyType: PaymentEntry.fields.partyType,
    party: PaymentEntry.fields.party,
    paidFrom: PaymentEntry.fields.paidFrom,
    paidTo: PaymentEntry.fields.paidTo,
    paidAmount: PaymentEntry.fields.paidAmount,
    costCenter: PaymentEntry.fields.costCenter,
  },
  answer: { paymentEntry: PaymentEntry.fields.id },
  move: machine.moves.create,
  errors: [
    PaymentAccountNotInCompany,
    PaymentAccountIsGroup,
    PaymentCostCenterNotInCompany,
    PaymentCostCenterIsGroup,
    PartyAccountWrongType,
    PartyNotFound,
    PartyNotInCompany,
    PaidAmountZero,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
