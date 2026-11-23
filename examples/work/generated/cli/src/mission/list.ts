// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/list.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List missions, newest first, 20 to a page, filtered by owner, state. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const list = Command.make(
  "list",
  { owner: Flag.optional(Flag.String("owner").pipe(Flag.withMetavar("id"), Flag.withDescription("Mission owner: an id (per_...)."))), state: Flag.optional(Flag.String("state").pipe(Flag.withMetavar("text"), Flag.withDescription("The state: text of up to 64 characters."))), cursor: Flag.optional(Flag.String("cursor").pipe(Flag.withMetavar("text"), Flag.withDescription("The cursor: text of up to 64 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.mission.list), Output.answer(json)),
).pipe(Command.withDescription("List missions, newest first, 20 to a page, filtered by owner, state."));
