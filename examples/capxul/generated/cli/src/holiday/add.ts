// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/holiday/add.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add one day off to a holiday list. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const add = Command.make(
  "add",
  { holidayList: Flag.String("holidayList").pipe(Flag.withMetavar("id"), Flag.withDescription("Holiday holiday list: an id (hls_...).")), holidayDate: Flag.String("holidayDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Holiday holiday date: text.")), description: Flag.String("description").pipe(Flag.withMetavar("holiday-name"), Flag.withDescription("Holiday description: text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.holiday.add), Output.answer(json)),
).pipe(Command.withDescription("Add one day off to a holiday list. Creates a holiday, which starts active."));
