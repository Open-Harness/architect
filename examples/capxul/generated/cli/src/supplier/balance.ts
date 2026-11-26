// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/supplier/balance.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** A supplier's balance on a day, from the ledger lines posted with it as their party. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const balance = Command.make(
  "balance",
  { supplier: Flag.String("supplier").pipe(Flag.withMetavar("id"), Flag.withDescription("Supplier id: an id (sup_...).")), onDay: Flag.String("onDay").pipe(Flag.withMetavar("day"), Flag.withDescription("The last day counted: lines posted on it count. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.supplier.balance), Output.answer(json)),
).pipe(Command.withDescription("A supplier's balance on a day, from the ledger lines posted with it as their party."));
