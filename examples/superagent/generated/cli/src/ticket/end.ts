// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/end.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const end = Command.make(
  "end",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.end), Output.answer(json)),
).pipe(Command.withDescription("End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle. Moves a ticket from open to ended."));
