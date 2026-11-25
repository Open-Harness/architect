// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/interview/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Schedule an applicant's interview at a round, on a day, with the employees who interview. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { jobApplicant: Flag.String("jobApplicant").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview job applicant: an id (jap_...).")), interviewRound: Flag.String("interviewRound").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview interview round: an id (irn_...).")), scheduledOn: Flag.String("scheduledOn").pipe(Flag.withMetavar("day"), Flag.withDescription("Interview scheduled on: text.")), fromTime: Flag.String("fromTime").pipe(Flag.withMetavar("time-of-day"), Flag.withDescription("Interview from time: text.")), toTime: Flag.String("toTime").pipe(Flag.withMetavar("time-of-day"), Flag.withDescription("Interview to time: text.")), interviewers: Flag.String("interviewers").pipe(Flag.withMetavar("interviewers"), Flag.withDescription("Interview interviewers: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.interview.create), Output.answer(json)),
).pipe(Command.withDescription("Schedule an applicant's interview at a round, on a day, with the employees who interview. Creates an interview, which starts pending."));
