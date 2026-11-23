// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bank-account/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { business: Flag.String("business").pipe(Flag.withMetavar("id"), Flag.withDescription("The company's approved KYB the account is opened on. An id (kyb_...).")), accountName: Flag.String("accountName").pipe(Flag.withMetavar("name"), Flag.withDescription("What the company calls the account (ERPNext's `account_name`). Text of up to 140 characters.")), currency: Flag.String("currency").pipe(Flag.withMetavar("account-currency"), Flag.withDescription("The currency it takes deposits in. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bankAccount.open), Output.answer(json)),
).pipe(Command.withDescription("Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. Creates a bank account, which starts open."));
