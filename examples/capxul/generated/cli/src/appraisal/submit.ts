// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal/submit.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Submit an appraisal, fixing its scores. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const submit = Command.make(
  "submit",
  { appraisal: Flag.String("appraisal").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal id: an id (apr_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisal.submit), Output.answer(json)),
).pipe(Command.withDescription("Submit an appraisal, fixing its scores. Moves an appraisal from draft to submitted."));
