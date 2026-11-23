// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/waiting.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List assignments, oldest first, 255 to a page, filtered by superagent, the rows with why person ahead of the rest. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const waiting = Command.make(
  "waiting",
  { superagent: Flag.optional(Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment superagent: an id (sag_...)."))), cursor: Flag.optional(Flag.String("cursor").pipe(Flag.withMetavar("text"), Flag.withDescription("The cursor: text of up to 64 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.assignment.waiting), Output.answer(json)),
).pipe(Command.withDescription("List assignments, oldest first, 255 to a page, filtered by superagent, the rows with why person ahead of the rest."));
