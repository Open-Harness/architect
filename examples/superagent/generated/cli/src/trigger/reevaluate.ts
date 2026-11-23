// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/trigger/reevaluate.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the main agent to judge a trigger again. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reevaluate = Command.make(
  "reevaluate",
  { trigger: Flag.String("trigger").pipe(Flag.withMetavar("id"), Flag.withDescription("Trigger id: an id (trg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.trigger.reevaluate), Output.answer(json)),
).pipe(Command.withDescription("Ask the main agent to judge a trigger again."));
