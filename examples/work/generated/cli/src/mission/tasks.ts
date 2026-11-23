// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/tasks.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The mission's tasks, each in the column its facts put it in. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const tasks = Command.make(
  "tasks",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Mission id: an id (msn_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.tasks), Output.answer(json)),
).pipe(Command.withDescription("The mission's tasks, each in the column its facts put it in."));
