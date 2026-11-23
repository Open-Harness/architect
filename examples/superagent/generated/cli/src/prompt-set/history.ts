// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/prompt-set/history.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const history = Command.make(
  "history",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Prompt set superagent: an id (sag_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.promptSet.history), Output.answer(json)),
).pipe(Command.withDescription("Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step."));
