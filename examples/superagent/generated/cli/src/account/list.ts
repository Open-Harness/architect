// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/list.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Let an account ask: its person's words may then start work. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const list = Command.make(
  "list",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("Account id: an id (acc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.account.list), Output.answer(json)),
).pipe(Command.withDescription("Let an account ask: its person's words may then start work. Moves an account from seen or unlisted to listed."));
