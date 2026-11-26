// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/customer/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a customer to a company. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer company: an id (com_...).")), customerName: Flag.String("customerName").pipe(Flag.withMetavar("name"), Flag.withDescription("Customer customer name: text of up to 140 characters.")), customerType: Flag.String("customerType").pipe(Flag.withMetavar("party-kind"), Flag.withDescription("Customer customer type: text.")), customerGroup: Flag.optional(Flag.String("customerGroup").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer customer group: an id (cgr_...)."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.customer.create), Output.answer(json)),
).pipe(Command.withDescription("Add a customer to a company. Creates a customer, which starts active."));
