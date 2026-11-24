// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/expense/add.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add one expense to a claim still in draft. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const add = Command.make(
  "add",
  { expenseClaim: Flag.String("expenseClaim").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense expense claim: an id (ecl_...).")), expenseDate: Flag.String("expenseDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Expense expense date: text.")), expenseType: Flag.String("expenseType").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense expense type: an id (ect_...).")), amount: Flag.String("amount").pipe(Flag.withMetavar("amount"), Flag.withDescription("Expense amount: text.")), sanctionedAmount: Flag.String("sanctionedAmount").pipe(Flag.withMetavar("amount"), Flag.withDescription("Expense sanctioned amount: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.expense.add), Output.answer(json)),
).pipe(Command.withDescription("Add one expense to a claim still in draft. Creates an expense, which starts active."));
