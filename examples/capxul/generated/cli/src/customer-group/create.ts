// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/customer-group/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a customer group to a company, under a group or as its one root. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer group company: an id (com_...).")), customerGroupName: Flag.String("customerGroupName").pipe(Flag.withMetavar("name"), Flag.withDescription("Customer group customer group name: text of up to 140 characters.")), parentCustomerGroup: Flag.optional(Flag.String("parentCustomerGroup").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer group parent customer group: an id (cgr_...)."))), isGroup: Flag.String("isGroup").pipe(Flag.withMetavar("yes-no"), Flag.withDescription("Make it a group, which other customer groups sit under, rather than a ledger, which customers are put in. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.customerGroup.create), Output.answer(json)),
).pipe(Command.withDescription("Add a customer group to a company, under a group or as its one root. Creates a customer group, which starts group or ledger."));
