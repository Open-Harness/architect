// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/sync.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List the accounts a connection's own roster names: a repository's collaborators, a user group. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const sync = Command.make(
  "sync",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Account superagent: an id (sag_...).")), source: Flag.String("source").pipe(Flag.withMetavar("text"), Flag.withDescription("Account source: text of up to 60 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.account.sync), Output.answer(json)),
).pipe(Command.withDescription("List the accounts a connection's own roster names: a repository's collaborators, a user group."));
