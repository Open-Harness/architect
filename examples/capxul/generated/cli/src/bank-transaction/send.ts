// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bank-transaction/send.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Send money out of a company's bank account to a payee, through Bridge. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const send = Command.make(
  "send",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("The company's bank account the money moved on. An id (bac_...).")), amount: Flag.String("amount").pipe(Flag.withMetavar("dollars"), Flag.withDescription("What to send, in dollars, at most six places, as Bridge takes it. Text.")), currency: Flag.String("currency").pipe(Flag.withMetavar("account-currency"), Flag.withDescription("The currency the payee is paid in: the account's own. Text.")), party: Flag.String("party").pipe(Flag.withMetavar("party"), Flag.withDescription("The payee: the Bridge external account the money goes to. Text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bankTransaction.send), Output.answer(json)),
).pipe(Command.withDescription("Send money out of a company's bank account to a payee, through Bridge. Creates a bank transaction, which starts pending."));
