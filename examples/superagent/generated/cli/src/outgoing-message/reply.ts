// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/outgoing-message/reply.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reply = Command.make(
  "reply",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Outgoing message superagent: an id (sag_...).")), ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Outgoing message ticket: an id (tkt_...).")), conversation: Flag.String("conversation").pipe(Flag.withMetavar("text"), Flag.withDescription("Outgoing message conversation: text of up to 200 characters.")), purpose: Flag.String("purpose").pipe(Flag.withMetavar("text"), Flag.withDescription("Outgoing message purpose: text of up to 40 characters.")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("Outgoing message text: text of up to 65536 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.outgoingMessage.reply), Output.answer(json)),
).pipe(Command.withDescription("Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row. Creates an outgoing message, which starts pending."));
