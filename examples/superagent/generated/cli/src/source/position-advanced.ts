// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/source/position-advanced.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record how far a connection has read, after a poll. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const positionAdvanced = Command.make(
  "position-advanced",
  { source: Flag.String("source").pipe(Flag.withMetavar("id"), Flag.withDescription("Source id: an id (src_...).")), position: Flag.String("position").pipe(Flag.withMetavar("text"), Flag.withDescription("Source position: text of up to 500 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.source.positionAdvanced), Output.answer(json)),
).pipe(Command.withDescription("Record how far a connection has read, after a poll. Moves a source from ready to ready."));
