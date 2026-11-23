// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/stop.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Stop the mission for good. Its runs are stopped with it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const stop = Command.make(
  "stop",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Mission id: an id (msn_...).")), why: Flag.String("why").pipe(Flag.withMetavar("note"), Flag.withDescription("A note: text of up to 4000 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.stop), Output.answer(json)),
).pipe(Command.withDescription("Stop the mission for good. Its runs are stopped with it. Moves a mission from intake or running or paused to stopped."));
