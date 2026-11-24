// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/thread/unrelated.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The executor says a thread has nothing to do with its ticket. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const unrelated = Command.make(
  "unrelated",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), thread: Flag.String("thread").pipe(Flag.withMetavar("text"), Flag.withDescription("The thread: text of up to 200 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.thread.unrelated), Output.answer(json)),
).pipe(Command.withDescription("The executor says a thread has nothing to do with its ticket."));
