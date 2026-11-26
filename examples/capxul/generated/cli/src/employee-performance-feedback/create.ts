// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-performance-feedback/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria. Each flag is handed on as text (lists and objects are JSON); the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { appraisal: Flag.String("appraisal").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee performance feedback appraisal: an id (apr_...).")), reviewer: Flag.String("reviewer").pipe(Flag.withMetavar("id"), Flag.withDescription("The employee who gives it. An id (emp_...).")), feedback: Flag.String("feedback").pipe(Flag.withMetavar("feedback-text"), Flag.withDescription("Employee performance feedback feedback: text of up to 2000 characters.")), ratings: Flag.String("ratings").pipe(Flag.withMetavar("json"), Flag.withDescription("A given ratings: a list, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeePerformanceFeedback.create), Output.answer(json)),
).pipe(Command.withDescription("Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria. Creates an employee performance feedback, which starts draft."));
