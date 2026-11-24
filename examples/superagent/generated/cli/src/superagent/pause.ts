// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/superagent/pause.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const pause = Command.make(
  "pause",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Superagent id: an id (sag_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.superagent.pause), Output.answer(json)),
).pipe(Command.withDescription("Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session. Moves a superagent from observing or live to paused."));
