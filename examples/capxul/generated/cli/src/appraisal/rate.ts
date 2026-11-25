// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal/rate.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Score each KRA of an appraisal by hand, from 0 to 5. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const rate = Command.make(
  "rate",
  { appraisal: Flag.String("appraisal").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal id: an id (apr_...).")), scores: Flag.String("scores").pipe(Flag.withMetavar("given-scores"), Flag.withDescription("A given scores: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisal.rate), Output.answer(json)),
).pipe(Command.withDescription("Score each KRA of an appraisal by hand, from 0 to 5. Moves an appraisal from draft to draft."));
