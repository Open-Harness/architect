// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attendance-request/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask for an employee to be marked at work, from one day to another, and why. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Attendance request company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Attendance request employee: an id (emp_...).")), fromDate: Flag.String("fromDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Attendance request from date: text.")), toDate: Flag.String("toDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Attendance request to date: text.")), reason: Flag.String("reason").pipe(Flag.withMetavar("attendance-reason"), Flag.withDescription("Attendance request reason: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attendanceRequest.create), Output.answer(json)),
).pipe(Command.withDescription("Ask for an employee to be marked at work, from one day to another, and why. Creates an attendance request, which starts draft."));
