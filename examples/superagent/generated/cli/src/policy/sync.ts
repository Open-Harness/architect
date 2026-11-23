// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/policy/sync.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List the accounts a connection's roster names. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const sync = Command.make(
  "sync",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Policy superagent: an id (sag_...).")), source: Flag.String("source").pipe(Flag.withMetavar("text"), Flag.withDescription("The source: text of up to 60 characters.")), why: Flag.optional(Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("The why: text of up to 2000 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.policy.sync), Output.answer(json)),
).pipe(Command.withDescription("List the accounts a connection's roster names."));
