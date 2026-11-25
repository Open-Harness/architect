// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal/self-rate.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Rate yourself against each of your appraisal's criteria, from 0 to 1. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const selfRate = Command.make(
  "self-rate",
  { appraisal: Flag.String("appraisal").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal id: an id (apr_...).")), ratings: Flag.String("ratings").pipe(Flag.withMetavar("given-ratings"), Flag.withDescription("A given ratings: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisal.selfRate), Output.answer(json)),
).pipe(Command.withDescription("Rate yourself against each of your appraisal's criteria, from 0 to 1. Moves an appraisal from draft to draft."));
