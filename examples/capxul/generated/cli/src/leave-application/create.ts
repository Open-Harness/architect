// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/leave-application/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask for leave of one type, from one day to another, and why. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave application company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave application employee: an id (emp_...).")), leaveType: Flag.String("leaveType").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave application leave type: an id (lty_...).")), fromDate: Flag.String("fromDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Leave application from date: text.")), toDate: Flag.String("toDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Leave application to date: text.")), reason: Flag.String("reason").pipe(Flag.withMetavar("leave-reason"), Flag.withDescription("Leave application reason: text of up to 500 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.leaveApplication.create), Output.answer(json)),
).pipe(Command.withDescription("Ask for leave of one type, from one day to another, and why. Creates a leave application, which starts open."));
