// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/prompt-set/preview.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Show the prompt an agent of one kind would get, with a draft applied. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const preview = Command.make(
  "preview",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Prompt set superagent: an id (sag_...).")), role: Flag.String("role").pipe(Flag.withMetavar("text"), Flag.withDescription("The role: text of up to 40 characters.")), sections: Flag.String("sections").pipe(Flag.withMetavar("text"), Flag.withDescription("Prompt set sections: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.promptSet.preview), Output.answer(json)),
).pipe(Command.withDescription("Show the prompt an agent of one kind would get, with a draft applied."));
