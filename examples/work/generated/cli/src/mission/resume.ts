// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/resume.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Pick a paused mission up again. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const resume = Command.make(
  "resume",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Mission id: an id (msn_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.resume), Output.answer(json)),
).pipe(Command.withDescription("Pick a paused mission up again. Moves a mission from paused to running."));
