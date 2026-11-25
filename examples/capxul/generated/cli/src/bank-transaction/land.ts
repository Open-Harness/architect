// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bank-transaction/land.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record a deposit Bridge landed on a company's bank account. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const land = Command.make(
  "land",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("The company's bank account the money moved on. An id (bac_...).")), reference: Flag.String("reference").pipe(Flag.withMetavar("bridge-ref"), Flag.withDescription("Bridge's id for the movement: the deposit's, or the transfer's. Text of up to 140 characters.")), amount: Flag.String("amount").pipe(Flag.withMetavar("dollars"), Flag.withDescription("What landed, as Bridge writes it: dollars, at most six places. Text.")), party: Flag.String("party").pipe(Flag.withMetavar("party"), Flag.withDescription("Who sent the deposit, or the external account the transfer pays. Text of up to 140 characters.")), date: Flag.String("date").pipe(Flag.withMetavar("day"), Flag.withDescription("The day the money moved, as Bridge dates it. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bankTransaction.land), Output.answer(json)),
).pipe(Command.withDescription("Record a deposit Bridge landed on a company's bank account. Creates a bank transaction, which starts settled."));
