// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/started.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Give a waiting Assignment a seat, if one is free for it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const started = Command.make(
  "started",
  { assignment: Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment id: an id (asg_...).")), seat: Flag.Int("seat").pipe(Flag.map(String), Flag.withDescription("Assignment seat: a whole number below 2^8.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.started), Output.answer(json)),
).pipe(Command.withDescription("Give a waiting Assignment a seat, if one is free for it. Moves an assignment from pending to running."));
