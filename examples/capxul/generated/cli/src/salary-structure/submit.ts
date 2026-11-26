// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/salary-structure/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit a salary structure, so it can be assigned. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { salaryStructure: Flag.String("salaryStructure").pipe(Flag.withMetavar("id"), Flag.withDescription("Salary structure id: an id (sst_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.salaryStructure.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit a salary structure, so it can be assigned. Moves a salary structure from draft to submitted."));
