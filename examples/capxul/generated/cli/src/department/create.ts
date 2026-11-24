// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/department/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a department to a company. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Department company: an id (com_...).")), departmentName: Flag.String("departmentName").pipe(Flag.withMetavar("name"), Flag.withDescription("Department department name: text of up to 140 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.department.create), Output.answer(json)),
).pipe(Command.withDescription("Add a department to a company. Creates a department, which starts active."));
