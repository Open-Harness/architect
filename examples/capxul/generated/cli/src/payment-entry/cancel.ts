// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payment-entry/cancel.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Cancel a submitted payment, posting a reversing ledger line for each it posted. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const cancel = Command.make(
  "cancel",
  { paymentEntry: Flag.String("paymentEntry").pipe(Flag.withMetavar("id"), Flag.withDescription("Payment entry id: an id (pen_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.paymentEntry.cancel), Output.answer(json)),
).pipe(Command.withDescription("Cancel a submitted payment, posting a reversing ledger line for each it posted. Moves a payment entry from submitted to cancelled."));
