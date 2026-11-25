// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/expense-claim-type/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a kind of expense a company pays back. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense claim type company: an id (com_...).")), expenseType: Flag.String("expenseType").pipe(Flag.withMetavar("expense-type-name"), Flag.withDescription("Expense claim type expense type: text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.expenseClaimType.create), Output.answer(json)),
).pipe(Command.withDescription("Add a kind of expense a company pays back. Creates an expense claim type, which starts active."));
