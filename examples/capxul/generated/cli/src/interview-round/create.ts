// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/interview-round/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a stage of hiring to a company, with the employees who interview at it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Interview round company: an id (com_...).")), roundName: Flag.String("roundName").pipe(Flag.withMetavar("name"), Flag.withDescription("Interview round round name: text of up to 140 characters.")), interviewers: Flag.String("interviewers").pipe(Flag.withMetavar("interviewers"), Flag.withDescription("Interview round interviewers: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.interviewRound.create), Output.answer(json)),
).pipe(Command.withDescription("Add a stage of hiring to a company, with the employees who interview at it. Creates an interview round, which starts active."));
