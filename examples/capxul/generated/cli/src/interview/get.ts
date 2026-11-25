// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/interview/get.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const get = Command.make(
  "get",
  { id: Flag.String("id").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview id: an id (ivw_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.interview.get), Output.answer(json)),
).pipe(Command.withDescription("Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state."));
