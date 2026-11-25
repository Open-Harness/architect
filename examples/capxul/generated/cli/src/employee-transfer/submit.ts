// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-transfer/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit a transfer on or after its day, giving the employee the new department. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { employeeTransfer: Flag.String("employeeTransfer").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee transfer id: an id (etr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeeTransfer.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit a transfer on or after its day, giving the employee the new department. Moves an employee transfer from draft to submitted."));
