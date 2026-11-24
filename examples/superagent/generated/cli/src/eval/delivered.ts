// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/eval/delivered.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const delivered = Command.make(
  "delivered",
  { eval: Flag.String("eval").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval id: an id (evl_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.eval.delivered), Output.answer(json)),
).pipe(Command.withDescription("Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it. Moves an eval from queued to delivered."));
