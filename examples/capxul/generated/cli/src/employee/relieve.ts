// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee/relieve.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record that an employee has left the company, on the day they were relieved. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const relieve = Command.make(
  "relieve",
  { employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee id: an id (emp_...).")), relievingDate: Flag.String("relievingDate").pipe(Flag.withMetavar("day"), Flag.withDescription("A day: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employee.relieve), Output.answer(json)),
).pipe(Command.withDescription("Record that an employee has left the company, on the day they were relieved. Moves an employee from active to left."));
