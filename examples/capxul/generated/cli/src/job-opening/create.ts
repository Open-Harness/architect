// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/job-opening/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open a job under one of a company's job titles, for some number of people. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { designation: Flag.String("designation").pipe(Flag.withMetavar("id"), Flag.withDescription("Job opening designation: an id (dsg_...).")), jobTitle: Flag.String("jobTitle").pipe(Flag.withMetavar("name"), Flag.withDescription("Job opening job title: text of up to 140 characters.")), vacancies: Flag.Int("vacancies").pipe(Flag.map(String), Flag.withDescription("Job opening vacancies: a whole number below 2^16.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.jobOpening.create), Output.answer(json)),
).pipe(Command.withDescription("Open a job under one of a company's job titles, for some number of people. Creates a job opening, which starts open."));
