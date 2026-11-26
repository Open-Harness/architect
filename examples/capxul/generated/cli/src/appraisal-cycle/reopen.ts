// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/appraisal-cycle/reopen.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Put a completed cycle back in progress. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reopen = Command.make(
  "reopen",
  { appraisalCycle: Flag.String("appraisalCycle").pipe(Flag.withMetavar("id"), Flag.withDescription("Appraisal cycle id: an id (apc_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.appraisalCycle.reopen), Output.answer(json)),
).pipe(Command.withDescription("Put a completed cycle back in progress. Moves an appraisal cycle from completed to inProgress."));
