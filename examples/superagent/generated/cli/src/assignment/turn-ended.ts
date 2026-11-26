// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/turn-ended.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The Agent idled on this Assignment or closed it: it ends, and its seat is free. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const turnEnded = Command.make(
  "turn-ended",
  { assignment: Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment id: an id (asg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.turnEnded), Output.answer(json)),
).pipe(Command.withDescription("The Agent idled on this Assignment or closed it: it ends, and its seat is free. Moves an assignment from running or closing to ended."));
