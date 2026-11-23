// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/stop.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Stop a ticket: its mandate is withdrawn and its executor's turn closed. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const stop = Command.make(
  "stop",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket superagent: an id (sag_...).")), ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.stop), Output.answer(json)),
).pipe(Command.withDescription("Stop a ticket: its mandate is withdrawn and its executor's turn closed. Moves a ticket from open or ended to stopped."));
