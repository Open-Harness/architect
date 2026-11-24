// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/input/route.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Send a waiting Input to its running executor, or queue the Assignment that will start one. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const route = Command.make(
  "route",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Input ticket: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.input.route), Output.answer(json)),
).pipe(Command.withDescription("Send a waiting Input to its running executor, or queue the Assignment that will start one. Moves an input from waiting to routed."));
