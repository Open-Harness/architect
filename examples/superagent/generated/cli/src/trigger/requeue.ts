// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/trigger/requeue.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Put a trigger back for evaluation. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const requeue = Command.make(
  "requeue",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Trigger superagent: an id (sag_...).")), trigger: Flag.String("trigger").pipe(Flag.withMetavar("id"), Flag.withDescription("Trigger id: an id (trg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.trigger.requeue), Output.answer(json)),
).pipe(Command.withDescription("Put a trigger back for evaluation. Moves a trigger from stored to stored."));
