// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/holiday-list/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start a company's list of days off, between two days. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Holiday list company: an id (com_...).")), holidayListName: Flag.String("holidayListName").pipe(Flag.withMetavar("name"), Flag.withDescription("Holiday list holiday list name: text of up to 140 characters.")), fromDate: Flag.String("fromDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Holiday list from date: text.")), toDate: Flag.String("toDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Holiday list to date: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.holidayList.create), Output.answer(json)),
).pipe(Command.withDescription("Start a company's list of days off, between two days. Creates a holiday list, which starts active."));
