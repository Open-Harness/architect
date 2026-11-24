// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/company/create.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set up a company; the person who sets it up runs it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const create = Command.make(
  "create",
  { companyName: Flag.String("companyName").pipe(Flag.withMetavar("name"), Flag.withDescription("Company company name: text of up to 140 characters.")), abbr: Flag.String("abbr").pipe(Flag.withMetavar("abbr"), Flag.withDescription("Company abbr: text of up to 10 characters.")), country: Flag.String("country").pipe(Flag.withMetavar("country"), Flag.withDescription("Company country: text of up to 60 characters.")), defaultCurrency: Flag.String("defaultCurrency").pipe(Flag.withMetavar("currency-code"), Flag.withDescription("Company default currency: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.company.create), Output.answer(json)),
).pipe(Command.withDescription("Set up a company; the person who sets it up runs it. Creates a company, which starts active."));
