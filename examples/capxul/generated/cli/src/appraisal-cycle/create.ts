// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-cycle/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal cycle company: an id (com_...).")), cycleName: Flag.String("cycleName").pipe(Flag.withMetavar("cycle-name"), Flag.withDescription("Appraisal cycle cycle name: text of up to 140 characters.")), startDate: Flag.String("startDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Appraisal cycle start date: text.")), endDate: Flag.String("endDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Appraisal cycle end date: text.")), kraEvaluationMethod: Flag.String("kraEvaluationMethod").pipe(Flag.withMetavar("evaluation-method"), Flag.withDescription("Appraisal cycle kra evaluation method: text.")), appraisees: Flag.String("appraisees").pipe(Flag.withMetavar("appraisees"), Flag.withDescription("Appraisal cycle appraisees: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalCycle.create), Output.answer(json)),
).pipe(Command.withDescription("Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template. Creates an appraisal cycle, which starts notStarted."));
