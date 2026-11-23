// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/thread/closed.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Say a thread closed: a merged pull request, a closed issue. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const closed = Command.make(
  "closed",
  { thread: Flag.String("thread").pipe(Flag.withMetavar("id"), Flag.withDescription("Thread id: an id (thr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.thread.closed), Output.answer(json)),
).pipe(Command.withDescription("Say a thread closed: a merged pull request, a closed issue. Moves a thread from idle or queued or evaluating to idle."));
