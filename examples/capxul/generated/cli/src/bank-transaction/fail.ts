// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bank-transaction/fail.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that Bridge couldn't pay a transfer out, and how it ended. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const fail = Command.make(
  "fail",
  { transaction: Flag.String("transaction").pipe(Flag.withMetavar("id"), Flag.withDescription("Bank transaction id: an id (btx_...).")), state: Flag.String("state").pipe(Flag.withMetavar("transfer-failure"), Flag.withDescription("A transfer failure: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bankTransaction.fail), Output.answer(json)),
).pipe(Command.withDescription("Record that Bridge couldn't pay a transfer out, and how it ended. Moves a bank transaction from pending to failed."));
