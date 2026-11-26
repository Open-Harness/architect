// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/customer/enable.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Enable a disabled customer again. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const enable = Command.make(
  "enable",
  { customer: Flag.String("customer").pipe(Flag.withMetavar("id"), Flag.withDescription("Customer id: an id (cus_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.customer.enable), Output.answer(json)),
).pipe(Command.withDescription("Enable a disabled customer again. Moves a customer from disabled to active."));
