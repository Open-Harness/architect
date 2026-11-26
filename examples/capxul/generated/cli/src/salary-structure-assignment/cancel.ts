// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/salary-structure-assignment/cancel.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Cancel a submitted assignment, so payroll no longer counts it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const cancel = Command.make(
  "cancel",
  { salaryStructureAssignment: Flag.String("salaryStructureAssignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Salary structure assignment id: an id (ssa_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.salaryStructureAssignment.cancel), Output.answer(json)),
).pipe(Command.withDescription("Cancel a submitted assignment, so payroll no longer counts it. Moves a salary structure assignment from submitted to cancelled."));
