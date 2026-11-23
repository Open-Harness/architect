// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/question/spike.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Not sure yet: turn the question into a spike task on its subject. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const spike = Command.make(
  "spike",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Question mission: an id (msn_...).")), question: Flag.String("question").pipe(Flag.withMetavar("id"), Flag.withDescription("Question id: an id (qst_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.question.spike), Output.answer(json)),
).pipe(Command.withDescription("Not sure yet: turn the question into a spike task on its subject. Moves a question from asked to spiked."));
