// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/cancelled.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** End a pending Assignment that was never seated or told. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const cancelled = Command.make(
  "cancelled",
  { assignment: Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment id: an id (asg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.cancelled), Output.answer(json)),
).pipe(Command.withDescription("End a pending Assignment that was never seated or told. Moves an assignment from pending to ended."));
