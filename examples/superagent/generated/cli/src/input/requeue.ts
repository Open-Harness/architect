// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/input/requeue.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Put a refused or failed Input back to waiting, after a short wait that grows with each refusal. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const requeue = Command.make(
  "requeue",
  { input: Flag.String("input").pipe(Flag.withMetavar("id"), Flag.withDescription("Input id: an id (inp_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.input.requeue), Output.answer(json)),
).pipe(Command.withDescription("Put a refused or failed Input back to waiting, after a short wait that grows with each refusal. Moves an input from routed or failed to waiting."));
