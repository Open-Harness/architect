// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/outgoing-message/send.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const send = Command.make(
  "send",
  { message: Flag.String("message").pipe(Flag.withMetavar("id"), Flag.withDescription("Outgoing message id: an id (msg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.outgoingMessage.send), Output.answer(json)),
).pipe(Command.withDescription("Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success. Moves an outgoing message from pending to pending or sent or dropped."));
