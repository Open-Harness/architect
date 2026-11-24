// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/employee/hire.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Hire a person into a company, placed in one of its departments under one of its job titles. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const hire = Command.make(
  "hire",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee company: an id (com_...).")), person: Flag.String("person").pipe(Flag.withMetavar("id"), Flag.withDescription("The person employed, who signs in as themselves. An id (per_...).")), firstName: Flag.String("firstName").pipe(Flag.withMetavar("name"), Flag.withDescription("Employee first name: text of up to 140 characters.")), gender: Flag.String("gender").pipe(Flag.withMetavar("gender"), Flag.withDescription("Employee gender: text of up to 60 characters.")), dateOfBirth: Flag.String("dateOfBirth").pipe(Flag.withMetavar("day"), Flag.withDescription("Employee date of birth: text.")), dateOfJoining: Flag.String("dateOfJoining").pipe(Flag.withMetavar("day"), Flag.withDescription("Employee date of joining: text.")), department: Flag.String("department").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee department: an id (dep_...).")), designation: Flag.String("designation").pipe(Flag.withMetavar("id"), Flag.withDescription("Employee designation: an id (dsg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.employee.hire), Output.answer(json)),
).pipe(Command.withDescription("Hire a person into a company, placed in one of its departments under one of its job titles. Creates an employee, which starts active."));
