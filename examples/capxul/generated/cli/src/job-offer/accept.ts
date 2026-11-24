// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-offer/accept.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that the applicant accepted the offer. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const accept = Command.make(
  "accept",
  { jobOffer: Flag.String("jobOffer").pipe(Flag.withMetavar("id"), Flag.withDescription("Job offer id: an id (jof_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobOffer.accept), Output.answer(json)),
).pipe(Command.withDescription("Record that the applicant accepted the offer. Moves a job offer from awaiting to accepted."));
