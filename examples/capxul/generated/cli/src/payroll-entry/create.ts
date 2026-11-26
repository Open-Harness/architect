// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payroll-entry/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a payroll entry for a span of days, filled with the company's employees to pay. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Payroll entry company: an id (com_...).")), postingDate: Flag.String("postingDate").pipe(Flag.withMetavar("day"), Flag.withDescription("The day its salary slips and accrual journal entry are posted. Text.")), startDate: Flag.String("startDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Payroll entry start date: text.")), endDate: Flag.String("endDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Payroll entry end date: text.")), costCenter: Flag.String("costCenter").pipe(Flag.withMetavar("id"), Flag.withDescription("Payroll entry cost center: an id (cct_...).")), payrollPayableAccount: Flag.String("payrollPayableAccount").pipe(Flag.withMetavar("id"), Flag.withDescription("The ledger the net pay is credited to, owed to the employees until it is paid. An id (acc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.payrollEntry.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a payroll entry for a span of days, filled with the company's employees to pay. Creates a payroll entry, which starts draft."));
