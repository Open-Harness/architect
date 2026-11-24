// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/trigger/handback.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The executor hands a trigger back: it was not its to answer. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const handback = Command.make(
  "handback",
  { ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Ticket id: an id (tkt_...).")), trigger: Flag.String("trigger").pipe(Flag.withMetavar("id"), Flag.withDescription("Trigger id: an id (trg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.trigger.handback), Output.answer(json)),
).pipe(Command.withDescription("The executor hands a trigger back: it was not its to answer."));
