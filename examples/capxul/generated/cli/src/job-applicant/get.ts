// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-applicant/get.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Read one job-applicant by its id: company, jobOpening, applicantName, email, state. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const get = Command.make(
  "get",
  { id: Flag.String("id").pipe(Flag.withMetavar("id"), Flag.withDescription("Job applicant id: an id (jap_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobApplicant.get), Output.answer(json)),
).pipe(Command.withDescription("Read one job-applicant by its id: company, jobOpening, applicantName, email, state."));
