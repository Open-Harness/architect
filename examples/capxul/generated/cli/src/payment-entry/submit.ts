// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payment-entry/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit a payment, posting the party's ledger line and the bank's. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { paymentEntry: Flag.String("paymentEntry").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry id: an id (pen_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.paymentEntry.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit a payment, posting the party's ledger line and the bank's. Moves a payment entry from draft to submitted."));
