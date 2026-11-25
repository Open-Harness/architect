// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-cycle/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start a cycle, making an appraisal for each appraisee who has none yet. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { appraisalCycle: Flag.String("appraisalCycle").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal cycle id: an id (apc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalCycle.start), Output.answer(json)),
).pipe(Command.withDescription("Start a cycle, making an appraisal for each appraisee who has none yet. Moves an appraisal cycle from notStarted to inProgress."));
