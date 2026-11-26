// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employment-type/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a way a company employs people. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Employment type company: an id (com_...).")), employmentTypeName: Flag.String("employmentTypeName").pipe(Flag.withMetavar("name"), Flag.withDescription("Employment type employment type name: text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employmentType.create), Output.answer(json)),
).pipe(Command.withDescription("Add a way a company employs people. Creates an employment type, which starts active."));
