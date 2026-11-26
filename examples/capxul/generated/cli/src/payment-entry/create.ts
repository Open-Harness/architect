// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payment-entry/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a payment received from a party or paid to one, with no invoice: an advance. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry company: an id (com_...).")), paymentType: Flag.String("paymentType").pipe(Flag.withMetavar("payment-type"), Flag.withDescription("Payment entry payment type: text.")), postingDate: Flag.String("postingDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Payment entry posting date: text.")), partyType: Flag.String("partyType").pipe(Flag.withMetavar("party-type"), Flag.withDescription("Payment entry party type: text.")), party: Flag.String("party").pipe(Flag.withMetavar("party-id"), Flag.withDescription("Payment entry party: text of up to 64 characters.")), paidFrom: Flag.String("paidFrom").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry paid from: an id (acc_...).")), paidTo: Flag.String("paidTo").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry paid to: an id (acc_...).")), paidAmount: Flag.String("paidAmount").pipe(Flag.withMetavar("amount"), Flag.withDescription("Payment entry paid amount: text.")), costCenter: Flag.String("costCenter").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry cost center: an id (cct_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.paymentEntry.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a payment received from a party or paid to one, with no invoice: an advance. Creates a payment entry, which starts draft."));
