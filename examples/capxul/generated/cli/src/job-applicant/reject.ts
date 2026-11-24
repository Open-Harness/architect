// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-applicant/reject.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Turn an applicant down. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reject = Command.make(
  "reject",
  { jobApplicant: Flag.String("jobApplicant").pipe(Flag.withMetavar("id"), Flag.withDescription("Job applicant id: an id (jap_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobApplicant.reject), Output.answer(json)),
).pipe(Command.withDescription("Turn an applicant down. Moves a job applicant from open or hold to rejected."));
