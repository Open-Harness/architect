// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/thread/bind.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make the thread an event belongs to, once, for this superagent. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const bind = Command.make(
  "bind",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Thread superagent: an id (sag_...).")), source: Flag.String("source").pipe(Flag.withMetavar("text"), Flag.withDescription("Thread source: text of up to 60 characters.")), key: Flag.String("key").pipe(Flag.withMetavar("text"), Flag.withDescription("Thread key: text of up to 200 characters.")), channel: Flag.String("channel").pipe(Flag.withMetavar("text"), Flag.withDescription("Thread channel: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.thread.bind), Output.answer(json)),
).pipe(Command.withDescription("Make the thread an event belongs to, once, for this superagent. Creates a thread, which starts idle."));
