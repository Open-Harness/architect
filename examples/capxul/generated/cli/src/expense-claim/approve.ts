// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/expense-claim/approve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Approve a claim, owing the employee what was sanctioned. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const approve = Command.make(
  "approve",
  { expenseClaim: Flag.String("expenseClaim").pipe(Flag.withMetavar("id"), Flag.withDescription("Expense claim id: an id (ecl_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.expenseClaim.approve), Output.answer(json)),
).pipe(Command.withDescription("Approve a claim, owing the employee what was sanctioned. Moves an expense claim from draft to approved."));
