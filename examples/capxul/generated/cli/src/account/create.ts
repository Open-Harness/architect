// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/account/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add an account to a company's chart, under a group or as a root. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Account company: an id (com_...).")), accountName: Flag.String("accountName").pipe(Flag.withMetavar("name"), Flag.withDescription("Account account name: text of up to 140 characters.")), parentAccount: Flag.optional(Flag.String("parentAccount").pipe(Flag.withMetavar("id"), Flag.withDescription("Account parent account: an id (acc_...)."))), isGroup: Flag.String("isGroup").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Make it a group, which other accounts sit under, rather than a ledger, which takes entries. Text.")), rootType: Flag.optional(Flag.String("rootType").pipe(Flag.withMetavar("text"), Flag.withDescription("Account root type: text."))), accountType: Flag.optional(Flag.String("accountType").pipe(Flag.withMetavar("text"), Flag.withDescription("Account account type: text."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.account.create), Output.answer(json)),
).pipe(Command.withDescription("Add an account to a company's chart, under a group or as a root. Creates an account, which starts group or ledger."));
