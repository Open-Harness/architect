// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-applicant/hold.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Put an applicant on hold. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const hold = Command.make(
  "hold",
  { jobApplicant: Flag.String("jobApplicant").pipe(Flag.withMetavar("id"), Flag.withDescription("Job applicant id: an id (jap_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobApplicant.hold), Output.answer(json)),
).pipe(Command.withDescription("Put an applicant on hold. Moves a job applicant from open to hold."));
