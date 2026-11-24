// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/unlist.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Stop letting an account ask. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const unlist = Command.make(
  "unlist",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("Account id: an id (acc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.account.unlist), Output.answer(json)),
).pipe(Command.withDescription("Stop letting an account ask. Moves an account from listed to unlisted."));
