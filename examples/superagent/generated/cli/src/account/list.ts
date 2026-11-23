// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/list.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Let an account ask: its person's words may then start work. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const list = Command.make(
  "list",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("Account id: an id (acc_...).")), why: Flag.optional(Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("The why: text of up to 2000 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.account.list), Output.answer(json)),
).pipe(Command.withDescription("Let an account ask: its person's words may then start work. Moves an account from seen or unlisted to listed."));
