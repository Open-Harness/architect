// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/balance.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** An account's balance on a day: its own ledger lines and those of every account under it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const balance = Command.make(
  "balance",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("Account id: an id (acc_...).")), onDay: Flag.String("onDay").pipe(Flag.withMetavar("day"), Flag.withDescription("The last day counted: lines posted on it count. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.account.balance), Output.answer(json)),
).pipe(Command.withDescription("An account's balance on a day: its own ledger lines and those of every account under it."));
