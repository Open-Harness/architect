// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payroll-employee-detail/list.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List payroll-employee-details, oldest first, 100 to a page, filtered by payrollEntry. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const list = Command.make(
  "list",
  { payrollEntry: Flag.optional(Flag.String("payrollEntry").pipe(Flag.withMetavar("id"), Flag.withDescription("Payroll employee detail payroll entry: an id (pay_...)."))), cursor: Flag.optional(Flag.String("cursor").pipe(Flag.withMetavar("text"), Flag.withDescription("The cursor: text of up to 64 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.payrollEmployeeDetail.list), Output.answer(json)),
).pipe(Command.withDescription("List payroll-employee-details, oldest first, 100 to a page, filtered by payrollEntry."));
