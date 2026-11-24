// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/resume.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const resume = Command.make(
  "resume",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.resume), Output.answer(json)),
).pipe(Command.withDescription("Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory. Moves a ticket from ended to open."));
