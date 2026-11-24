// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/eval/context.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Read what a judgement needs: the thread's history and what else it touches. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const context = Command.make(
  "context",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval superagent: an id (sag_...).")), eval: Flag.String("eval").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval id: an id (evl_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.eval.context), Output.answer(json)),
).pipe(Command.withDescription("Read what a judgement needs: the thread's history and what else it touches."));
