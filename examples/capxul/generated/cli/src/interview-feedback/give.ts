// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/interview-feedback/give.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Give an interviewer's feedback on an interview: cleared or rejected. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const give = Command.make(
  "give",
  { interview: Flag.String("interview").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview feedback interview: an id (ivw_...).")), interviewer: Flag.String("interviewer").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview feedback interviewer: an id (emp_...).")), result: Flag.String("result").pipe(Flag.withMetavar("interview-result"), Flag.withDescription("Interview feedback result: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.interviewFeedback.give), Output.answer(json)),
).pipe(Command.withDescription("Give an interviewer's feedback on an interview: cleared or rejected. Creates an interview feedback, which starts given."));
