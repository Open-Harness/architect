// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/safe/record.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const record = Command.make(
  "record",
  { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.safe.record), Output.answer(json)),
).pipe(Command.withDescription("Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain. Creates a safe, which starts counterfactual."));
