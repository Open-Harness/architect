// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/accept.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const accept = Command.make(
  "accept",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket superagent: an id (sag_...).")), account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("The account: an id (acc_...).")), title: Flag.String("title").pipe(Flag.withMetavar("text"), Flag.withDescription("Ticket title: text of up to 200 characters.")), agent: Flag.String("agent").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket agent: an id (agt_...).")), thread: Flag.String("thread").pipe(Flag.withMetavar("text"), Flag.withDescription("The thread: text of up to 200 characters.")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("The text: text of up to 65536 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.accept), Output.answer(json)),
).pipe(Command.withDescription("Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit. Creates a ticket, which starts open."));
