// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-transfer/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a transfer: an employee's new department, from a day. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee transfer company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee transfer employee: an id (emp_...).")), transferDate: Flag.String("transferDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Employee transfer transfer date: text.")), newDepartment: Flag.String("newDepartment").pipe(Flag.withMetavar("id"), Flag.withDescription("The department the employee holds once it is submitted. An id (dep_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeeTransfer.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a transfer: an employee's new department, from a day. Creates an employee transfer, which starts draft."));
