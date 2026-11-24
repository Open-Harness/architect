// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/ack.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The executor acknowledges the message it was woken by, once, in one short reply. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const ack = Command.make(
  "ack",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), trigger: Flag.String("trigger").pipe(Flag.withMetavar("text"), Flag.withDescription("The trigger: text of up to 120 characters.")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("The text: text of up to 65536 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.ack), Output.answer(json)),
).pipe(Command.withDescription("The executor acknowledges the message it was woken by, once, in one short reply."));
