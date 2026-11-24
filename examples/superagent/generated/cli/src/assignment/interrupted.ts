// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/interrupted.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const interrupted = Command.make(
  "interrupted",
  { assignment: Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment id: an id (asg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.interrupted), Output.answer(json)),
).pipe(Command.withDescription("Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed. Moves an assignment from running to closing."));
