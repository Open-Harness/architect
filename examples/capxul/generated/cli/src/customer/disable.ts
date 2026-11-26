// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/customer/disable.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Disable a customer: no payment from it can be submitted until it is enabled again. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const disable = Command.make(
  "disable",
  { customer: Flag.String("customer").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer id: an id (cus_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.customer.disable), Output.answer(json)),
).pipe(Command.withDescription("Disable a customer: no payment from it can be submitted until it is enabled again. Moves a customer from active to disabled."));
