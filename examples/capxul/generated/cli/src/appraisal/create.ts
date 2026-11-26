// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make an employee's appraisal in a cycle, by a template. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal employee: an id (emp_...).")), appraisalCycle: Flag.String("appraisalCycle").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal appraisal cycle: an id (apc_...).")), appraisalTemplate: Flag.String("appraisalTemplate").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal appraisal template: an id (apt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisal.create), Output.answer(json)),
).pipe(Command.withDescription("Make an employee's appraisal in a cycle, by a template. Creates an appraisal, which starts draft."));
