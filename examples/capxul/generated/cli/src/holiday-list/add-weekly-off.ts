// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/holiday-list/add-weekly-off.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make every given weekday in a holiday list a day off. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const addWeeklyOff = Command.make(
  "add-weekly-off",
  { holidayList: Flag.String("holidayList").pipe(Flag.withMetavar("id"), Flag.withDescription("Holiday list id: an id (hls_...).")), weekday: Flag.String("weekday").pipe(Flag.withMetavar("weekday"), Flag.withDescription("A weekday: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.holidayList.addWeeklyOff), Output.answer(json)),
).pipe(Command.withDescription("Make every given weekday in a holiday list a day off. Moves a holiday list from active to active."));
