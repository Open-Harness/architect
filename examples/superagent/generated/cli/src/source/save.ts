// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/source/save.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Save a connection: its kind and its configuration. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const save = Command.make(
  "save",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Source superagent: an id (sag_...).")), name: Flag.String("name").pipe(Flag.withMetavar("text"), Flag.withDescription("Source name: text of up to 60 characters.")), kind: Flag.String("kind").pipe(Flag.withMetavar("text"), Flag.withDescription("Source kind: text of up to 40 characters.")), config: Flag.String("config").pipe(Flag.withMetavar("text"), Flag.withDescription("Source config: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.source.save), Output.answer(json)),
).pipe(Command.withDescription("Save a connection: its kind and its configuration. Creates a source, which starts setup."));
