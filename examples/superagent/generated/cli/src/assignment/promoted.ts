// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/promoted.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** A person's Input on a pending Assignment moves it up: its reason becomes a person's. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const promoted = Command.make(
  "promoted",
  { assignment: Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment id: an id (asg_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.promoted), Output.answer(json)),
).pipe(Command.withDescription("A person's Input on a pending Assignment moves it up: its reason becomes a person's. Moves an assignment from pending to pending."));
