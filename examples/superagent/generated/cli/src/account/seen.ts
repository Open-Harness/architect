// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/seen.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record an account an event came from: a new one is seen, a known one keeps its state. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const seen = Command.make(
  "seen",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Account superagent: an id (sag_...).")), source: Flag.String("source").pipe(Flag.withMetavar("text"), Flag.withDescription("Account source: text of up to 60 characters.")), external: Flag.String("external").pipe(Flag.withMetavar("text"), Flag.withDescription("Account external: text of up to 120 characters.")), login: Flag.String("login").pipe(Flag.withMetavar("text"), Flag.withDescription("Account login: text of up to 120 characters.")), bot: Flag.String("bot").pipe(Flag.withMetavar("text"), Flag.withDescription("Account bot: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.account.seen), Output.answer(json)),
).pipe(Command.withDescription("Record an account an event came from: a new one is seen, a known one keeps its state. Creates an account, which starts seen."));
