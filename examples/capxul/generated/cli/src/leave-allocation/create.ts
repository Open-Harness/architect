// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/leave-allocation/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Give an employee leave days of one type, between two days, as a draft. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave allocation company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave allocation employee: an id (emp_...).")), leaveType: Flag.String("leaveType").pipe(Flag.withMetavar("id"), Flag.withDescription("Leave allocation leave type: an id (lty_...).")), fromDate: Flag.String("fromDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Leave allocation from date: text.")), toDate: Flag.String("toDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Leave allocation to date: text.")), newLeavesAllocated: Flag.String("newLeavesAllocated").pipe(Flag.withMetavar("leave-days"), Flag.withDescription("Leave allocation new leaves allocated: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.leaveAllocation.create), Output.answer(json)),
).pipe(Command.withDescription("Give an employee leave days of one type, between two days, as a draft. Creates a leave allocation, which starts draft."));
