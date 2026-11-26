// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-template/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make an appraisal template: KRAs and rating criteria, each with its weightage. Each flag is handed on as text (lists and objects are JSON); the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal template company: an id (com_...).")), title: Flag.String("title").pipe(Flag.withMetavar("template-title"), Flag.withDescription("Appraisal template title: text of up to 140 characters.")), kras: Flag.String("kras").pipe(Flag.withMetavar("json"), Flag.withDescription("Appraisal template kras: a list, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), criteria: Flag.String("criteria").pipe(Flag.withMetavar("json"), Flag.withDescription("Appraisal template criteria: a list, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalTemplate.create), Output.answer(json)),
).pipe(Command.withDescription("Make an appraisal template: KRAs and rating criteria, each with its weightage. Creates an appraisal template, which starts active."));
