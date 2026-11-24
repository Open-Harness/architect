// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/bank-account/close.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Close a company's bank account; it takes no more deposits. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const close = Command.make(
  "close",
  { account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("Bank account id: an id (bac_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.bankAccount.close), Output.answer(json)),
).pipe(Command.withDescription("Close a company's bank account; it takes no more deposits. Moves a bank account from open to closed."));
