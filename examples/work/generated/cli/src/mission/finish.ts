// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/finish.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Close the mission: every task is closed by a fact up to its target. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const finish = Command.make(
  "finish",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Mission id: an id (msn_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.finish), Output.answer(json)),
).pipe(Command.withDescription("Close the mission: every task is closed by a fact up to its target. Moves a mission from running to done."));
