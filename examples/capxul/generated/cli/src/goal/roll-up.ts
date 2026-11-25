// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/goal/roll-up.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Bring a group goal's status up to date with the progress its children have rolled up. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const rollUp = Command.make(
  "roll-up",
  { goal: Flag.String("goal").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal id: an id (gol_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.goal.rollUp), Output.answer(json)),
).pipe(Command.withDescription("Bring a group goal's status up to date with the progress its children have rolled up. Moves a goal from pending or inProgress or completed to pending or inProgress or completed."));
