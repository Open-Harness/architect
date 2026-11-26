// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/payroll-entry/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit a payroll entry, making a draft salary slip for each of its employees. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { payrollEntry: Flag.String("payrollEntry").pipe(Flag.withMetavar("id"), Flag.withDescription("Payroll entry id: an id (pay_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.payrollEntry.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit a payroll entry, making a draft salary slip for each of its employees. Moves a payroll entry from draft to submitted."));
