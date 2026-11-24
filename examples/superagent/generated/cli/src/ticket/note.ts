// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/note.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Write a note on a ticket that does not wake its executor. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const note = Command.make(
  "note",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket superagent: an id (sag_...).")), ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("The text: text of up to 65536 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.note), Output.answer(json)),
).pipe(Command.withDescription("Write a note on a ticket that does not wake its executor."));
