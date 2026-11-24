// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/eval/expire.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Give up on an eval that ran out of time: it is unavailable, and keeps its triggers until a person reevaluates one. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const expire = Command.make(
  "expire",
  { eval: Flag.String("eval").pipe(Flag.withMetavar("id"), Flag.withDescription("Eval id: an id (evl_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.eval.expire), Output.answer(json)),
).pipe(Command.withDescription("Give up on an eval that ran out of time: it is unavailable, and keeps its triggers until a person reevaluates one. Moves an eval from delivered to unavailable."));
