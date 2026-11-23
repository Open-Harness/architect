// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/allowance/spend.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Spend from what is left of this month's allowance. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const spend = Command.make(
  "spend",
  { allowance: Flag.String("allowance").pipe(Flag.withMetavar("id"), Flag.withDescription("Allowance id: an id (alw_...).")), amount: Flag.String("amount").pipe(Flag.withMetavar("uint"), Flag.withDescription("An amount: a whole number below 2^128.")), memo: Flag.String("memo").pipe(Flag.withMetavar("memo"), Flag.withDescription("A memo: text of up to 200 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.spend), Output.answer(json)),
).pipe(Command.withDescription("Spend from what is left of this month's allowance. Moves an allowance from active to active or exhausted."));
