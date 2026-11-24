// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/expense-claim/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start an employee's claim for expenses the company pays back. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense claim company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense claim employee: an id (emp_...).")), postingDate: Flag.String("postingDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Expense claim posting date: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.expenseClaim.create), Output.answer(json)),
).pipe(Command.withDescription("Start an employee's claim for expenses the company pays back. Creates an expense claim, which starts draft."));
