// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/prompt-set/compose.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make the prompt for one agent's model request, from the current version. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const compose = Command.make(
  "compose",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Prompt set superagent: an id (sag_...).")), role: Flag.String("role").pipe(Flag.withMetavar("text"), Flag.withDescription("The role: text of up to 40 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.promptSet.compose), Output.answer(json)),
).pipe(Command.withDescription("Make the prompt for one agent's model request, from the current version."));
