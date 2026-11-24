// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attendance/mark.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Mark whether an employee was at work on a day. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const mark = Command.make(
  "mark",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Attendance company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Attendance employee: an id (emp_...).")), attendanceDate: Flag.String("attendanceDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Attendance attendance date: text.")), status: Flag.String("status").pipe(Flag.withMetavar("attendance-status"), Flag.withDescription("Attendance status: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attendance.mark), Output.answer(json)),
).pipe(Command.withDescription("Mark whether an employee was at work on a day. Creates an attendance, which starts marked."));
