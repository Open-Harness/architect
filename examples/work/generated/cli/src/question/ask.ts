// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/question/ask.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. Each flag is handed on as text (lists and objects are JSON); the declaration decodes it. `--json` prints the whole answer as JSON. */
export const ask = Command.make(
  "ask",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Question mission: an id (msn_...).")), asks: Flag.String("asks").pipe(Flag.withMetavar("title"), Flag.withDescription("Question asks: text of up to 200 characters.")), about: Flag.String("about").pipe(Flag.withMetavar("subject"), Flag.withDescription("Question about: text of up to 120 characters.")), gap: Flag.String("gap").pipe(Flag.withMetavar("note"), Flag.withDescription("Question gap: text of up to 4000 characters.")), options: Flag.String("options").pipe(Flag.withMetavar("json"), Flag.withDescription("Question options: a list, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.question.ask), Output.answer(json)),
).pipe(Command.withDescription("Ask the mission's owner about one gap in the blueprint, with lettered answers. Creates a question, which starts asked."));
