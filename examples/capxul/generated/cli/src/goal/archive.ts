// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/goal/archive.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Archive a goal: it no longer counts towards its parent or its appraisal. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const archive = Command.make(
  "archive",
  { goal: Flag.String("goal").pipe(Flag.withMetavar("id"), Flag.withDescription("Goal id: an id (gol_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.goal.archive), Output.answer(json)),
).pipe(Command.withDescription("Archive a goal: it no longer counts towards its parent or its appraisal. Moves a goal from pending or inProgress or closed to archived."));
