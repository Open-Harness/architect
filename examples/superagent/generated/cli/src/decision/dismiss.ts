// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/decision/dismiss.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Set aside a decision a person disagrees with. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const dismiss = Command.make(
  "dismiss",
  { decision: Flag.String("decision").pipe(Flag.withMetavar("id"), Flag.withDescription("Decision id: an id (dec_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.decision.dismiss), Output.answer(json)),
).pipe(Command.withDescription("Set aside a decision a person disagrees with. Moves a decision from recorded to dismissed."));
