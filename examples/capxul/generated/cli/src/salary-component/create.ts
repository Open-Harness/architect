// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/salary-component/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { company: Flag.String("company").pipe(Flag.withMetavar("id"), Flag.withDescription("Salary component company: an id (com_...).")), salaryComponent: Flag.String("salaryComponent").pipe(Flag.withMetavar("component-name"), Flag.withDescription("Salary component salary component: text of up to 140 characters.")), type: Flag.String("type").pipe(Flag.withMetavar("component-type"), Flag.withDescription("Salary component type: text.")), amount: Flag.String("amount").pipe(Flag.withMetavar("amount"), Flag.withDescription("What a structure line pays when it names no amount of its own, in USDC base units. 0 for none. Text.")), account: Flag.String("account").pipe(Flag.withMetavar("id"), Flag.withDescription("The company's ledger its pay is booked to: debited for an earning, credited for a deduction. An id (acc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.salaryComponent.create), Output.answer(json)),
).pipe(Command.withDescription("Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to. Creates a salary component, which starts active."));
