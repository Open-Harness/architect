// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/shift-type/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a working shift to a company, from its start time to its end time. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Shift type company: an id (com_...).")), shiftTypeName: Flag.String("shiftTypeName").pipe(Flag.withMetavar("name"), Flag.withDescription("Shift type shift type name: text of up to 140 characters.")), startTime: Flag.String("startTime").pipe(Flag.withMetavar("time-of-day"), Flag.withDescription("Shift type start time: text.")), endTime: Flag.String("endTime").pipe(Flag.withMetavar("time-of-day"), Flag.withDescription("Shift type end time: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.shiftType.create), Output.answer(json)),
).pipe(Command.withDescription("Add a working shift to a company, from its start time to its end time. Creates a shift type, which starts active."));
