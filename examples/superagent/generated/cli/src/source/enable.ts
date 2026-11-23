// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/source/enable.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start listening on a connection. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const enable = Command.make(
  "enable",
  { source: Flag.String("source").pipe(Flag.withMetavar("id"), Flag.withDescription("Source id: an id (src_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.source.enable), Output.answer(json)),
).pipe(Command.withDescription("Start listening on a connection. Moves a source from setup or paused or off or error to ready."));
