// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/us-withholding/compute.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Work out one pay's US tax lines from its wage, frequency, pay date, work state, wages so far this year and W-4. Each flag is handed on as text (lists and objects are JSON); the declaration decodes it. `--json` prints the whole answer as JSON. */
export const compute = Command.make(
  "compute",
  { wage: Flag.String("wage").pipe(Flag.withMetavar("text"), Flag.withDescription("The wage: text of up to 40 characters.")), frequency: Flag.String("frequency").pipe(Flag.withMetavar("text"), Flag.withDescription("The frequency: text.")), payDate: Flag.String("payDate").pipe(Flag.withMetavar("text"), Flag.withDescription("The pay date: text.")), workState: Flag.String("workState").pipe(Flag.withMetavar("text"), Flag.withDescription("The work state: text of up to 40 characters.")), yearToDate: Flag.String("yearToDate").pipe(Flag.withMetavar("text"), Flag.withDescription("The year to date: text of up to 40 characters.")), w4: Flag.String("w4").pipe(Flag.withMetavar("json"), Flag.withDescription("The w4: an object, as JSON.")).pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.usWithholding.compute), Output.answer(json)),
).pipe(Command.withDescription("Work out one pay's US tax lines from its wage, frequency, pay date, work state, wages so far this year and W-4."));
