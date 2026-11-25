// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/fiscal-year/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set up a company's fiscal year. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Fiscal year company: an id (com_...).")), year: Flag.String("year").pipe(Flag.withMetavar("year-name"), Flag.withDescription("Fiscal year year: text of up to 140 characters.")), yearStartDate: Flag.String("yearStartDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Fiscal year year start date: text.")), yearEndDate: Flag.String("yearEndDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Fiscal year year end date: text.")), isShortYear: Flag.String("isShortYear").pipe(Flag.withMetavar("text"), Flag.withDescription("A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`). Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.fiscalYear.create), Output.answer(json)),
).pipe(Command.withDescription("Set up a company's fiscal year. Creates a fiscal year, which starts active."));
