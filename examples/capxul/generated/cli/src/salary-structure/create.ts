// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/salary-structure/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a salary structure with its earnings and deductions. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Salary structure company: an id (com_...).")), salaryStructureName: Flag.String("salaryStructureName").pipe(Flag.withMetavar("structure-name"), Flag.withDescription("Salary structure salary structure name: text of up to 140 characters.")), earnings: Flag.String("earnings").pipe(Flag.withMetavar("text"), Flag.withDescription("Its earnings, in order: each a component and its amount, 0 for the component's own. At most 50. Text.")), deductions: Flag.String("deductions").pipe(Flag.withMetavar("text"), Flag.withDescription("Its deductions, in order: each a component and its amount, 0 for the component's own. At most 50. Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.salaryStructure.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a salary structure with its earnings and deductions. Creates a salary structure, which starts draft."));
