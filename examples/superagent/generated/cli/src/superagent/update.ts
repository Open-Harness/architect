// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/superagent/update.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Save a superagent's configuration as a new version; a stale save is refused. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const update = Command.make(
  "update",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Superagent id: an id (sag_...).")), base: Flag.Int("base").pipe(Flag.map(String), Flag.withDescription("The base: a whole number below 2^32.")), name: Flag.String("name").pipe(Flag.withMetavar("text"), Flag.withDescription("Superagent name: text of up to 60 characters.")), purpose: Flag.String("purpose").pipe(Flag.withMetavar("text"), Flag.withDescription("Superagent purpose: text of up to 2000 characters.")), connections: Flag.String("connections").pipe(Flag.withMetavar("text"), Flag.withDescription("Superagent connections: text.")), playbook: Flag.String("playbook").pipe(Flag.withMetavar("text"), Flag.withDescription("Superagent playbook: text.")), slots: Flag.Int("slots").pipe(Flag.map(String), Flag.withDescription("Superagent slots: a whole number below 2^8.")), why: Flag.optional(Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("The why: text of up to 2000 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.superagent.update), Output.answer(json)),
).pipe(Command.withDescription("Save a superagent's configuration as a new version; a stale save is refused."));
