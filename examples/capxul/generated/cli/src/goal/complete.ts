// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/goal/complete.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Mark a goal completed, setting its progress to 100. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const complete = Command.make(
  "complete",
  { goal: Flag.String("goal").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal id: an id (gol_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.goal.complete), Output.answer(json)),
).pipe(Command.withDescription("Mark a goal completed, setting its progress to 100. Moves a goal from pending or inProgress to completed."));
