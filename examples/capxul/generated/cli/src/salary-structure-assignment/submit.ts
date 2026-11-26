// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/salary-structure-assignment/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit an assignment, so payroll pays the employee by its structure from its day on. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { salaryStructureAssignment: Flag.String("salaryStructureAssignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Salary structure assignment id: an id (ssa_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.salaryStructureAssignment.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit an assignment, so payroll pays the employee by its structure from its day on. Moves a salary structure assignment from draft to submitted."));
