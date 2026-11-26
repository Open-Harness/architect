// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-cycle/complete.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Mark a cycle completed once every appraisal in it is submitted. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const complete = Command.make(
  "complete",
  { appraisalCycle: Flag.String("appraisalCycle").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal cycle id: an id (apc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalCycle.complete), Output.answer(json)),
).pipe(Command.withDescription("Mark a cycle completed once every appraisal in it is submitted. Moves an appraisal cycle from inProgress to completed."));
