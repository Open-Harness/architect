// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee-promotion/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Draft a promotion: an employee's new job title, from a day. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee promotion company: an id (com_...).")), employee: Flag.String("employee").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee promotion employee: an id (emp_...).")), promotionDate: Flag.String("promotionDate").pipe(Flag.withMetavar("day"), Flag.withDescription("Employee promotion promotion date: text.")), newDesignation: Flag.String("newDesignation").pipe(Flag.withMetavar("id"), Flag.withDescription("The job title the employee holds once it is submitted. An id (dsg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employeePromotion.create), Output.answer(json)),
).pipe(Command.withDescription("Draft a promotion: an employee's new job title, from a day. Creates an employee promotion, which starts draft."));
