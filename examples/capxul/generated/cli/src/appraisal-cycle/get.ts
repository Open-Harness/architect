// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-cycle/get.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Read one appraisal-cycle by its id: company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees, state. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const get = Command.make(
  "get",
  { id: Flag.String("id").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal cycle id: an id (apc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalCycle.get), Output.answer(json)),
).pipe(Command.withDescription("Read one appraisal-cycle by its id: company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees, state."));
