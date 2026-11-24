// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/thread/unsubscribe.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Stop a ticket following a thread: a person's call, or the main agent's. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const unsubscribe = Command.make(
  "unsubscribe",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Thread superagent: an id (sag_...).")), thread: Flag.String("thread").pipe(Flag.withMetavar("id"), Flag.withDescription("Thread id: an id (thr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.thread.unsubscribe), Output.answer(json)),
).pipe(Command.withDescription("Stop a ticket following a thread: a person's call, or the main agent's. Moves a thread from idle to idle."));
