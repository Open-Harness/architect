// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/stage.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Read one ticket by its id: superagent, title, state. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const stage = Command.make(
  "stage",
  { id: Flag.String("id").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.stage), Output.answer(json)),
).pipe(Command.withDescription("Read one ticket by its id: superagent, title, state."));
