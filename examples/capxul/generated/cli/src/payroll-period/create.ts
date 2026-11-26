// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payroll-period/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set up a company's payroll period. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Payroll period company: an id (com_...).")), payrollPeriodName: Flag.String("payrollPeriodName").pipe(Flag.withMetavar("period-name"), Flag.withDescription("Payroll period payroll period name: text of up to 140 characters.")), startDate: Flag.String("startDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Payroll period start date: text.")), endDate: Flag.String("endDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Payroll period end date: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.payrollPeriod.create), Output.answer(json)),
).pipe(Command.withDescription("Set up a company's payroll period. Creates a payroll period, which starts active."));
