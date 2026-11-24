// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-applicant/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a person who applied for a job opening. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { jobOpening: Flag.String("jobOpening").pipe(Flag.withMetavar("id"), Flag.withDescription("Job applicant job opening: an id (jop_...).")), applicantName: Flag.String("applicantName").pipe(Flag.withMetavar("name"), Flag.withDescription("Job applicant applicant name: text of up to 140 characters.")), email: Flag.String("email").pipe(Flag.withMetavar("applicant-email"), Flag.withDescription("Job applicant email: text of up to 254 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobApplicant.create), Output.answer(json)),
).pipe(Command.withDescription("Add a person who applied for a job opening. Creates a job applicant, which starts open."));
