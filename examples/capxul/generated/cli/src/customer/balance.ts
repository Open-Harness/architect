// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/customer/balance.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** A customer's balance on a day, from the ledger lines posted with it as their party. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const balance = Command.make(
  "balance",
  { customer: Flag.String("customer").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer id: an id (cus_...).")), onDay: Flag.String("onDay").pipe(Flag.withMetavar("day"), Flag.withDescription("The last day counted: lines posted on it count. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.customer.balance), Output.answer(json)),
).pipe(Command.withDescription("A customer's balance on a day, from the ledger lines posted with it as their party."));
