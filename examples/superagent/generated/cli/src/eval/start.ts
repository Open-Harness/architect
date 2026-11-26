// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/eval/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make an eval for one thread's waiting triggers. Each flag is handed on as text (lists and objects are JSON); the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval superagent: an id (sag_...).")), thread: Flag.String("thread").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval thread: an id (thr_...).")), triggers: Flag.String("triggers").pipe(Flag.withMetavar("json"), Flag.withDescription("Eval triggers: a list, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), timeoutMs: Flag.String("timeoutMs").pipe(Flag.withMetavar("uint"), Flag.withDescription("Eval timeout ms: a whole number below 2^64.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.eval.start), Output.answer(json)),
).pipe(Command.withDescription("Make an eval for one thread's waiting triggers. Creates an eval, which starts queued."));
