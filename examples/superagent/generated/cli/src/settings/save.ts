// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/settings/save.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const save = Command.make(
  "save",
  { base: Flag.Int("base").pipe(Flag.map(String), Flag.withDescription("The base: a whole number below 2^32.")), variables: Flag.String("variables").pipe(Flag.withMetavar("text"), Flag.withDescription("Settings variables: text.")), blocked: Flag.String("blocked").pipe(Flag.withMetavar("text"), Flag.withDescription("Settings blocked: text.")), why: Flag.optional(Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("The why: text of up to 2000 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.settings.save), Output.answer(json)),
).pipe(Command.withDescription("Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it. Creates a settings, which starts current."));
