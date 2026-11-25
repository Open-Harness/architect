// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/goal/update-progress.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set how far along a goal is, from 0 to 100. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const updateProgress = Command.make(
  "update-progress",
  { goal: Flag.String("goal").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal id: an id (gol_...).")), progress: Flag.String("progress").pipe(Flag.withMetavar("progress"), Flag.withDescription("Goal progress: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.goal.updateProgress), Output.answer(json)),
).pipe(Command.withDescription("Set how far along a goal is, from 0 to 100. Moves a goal from pending or inProgress or completed to pending or inProgress or completed."));
