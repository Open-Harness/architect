// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/trigger/receive.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const receive = Command.make(
  "receive",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Trigger superagent: an id (sag_...).")), source: Flag.String("source").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger source: text of up to 60 characters.")), event: Flag.String("event").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger event: text of up to 200 characters.")), thread: Flag.String("thread").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger thread: text of up to 200 characters.")), kind: Flag.String("kind").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger kind: text of up to 40 characters.")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger text: text of up to 65536 characters.")), url: Flag.optional(Flag.String("url").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger url: text of up to 500 characters."))), addressed: Flag.optional(Flag.String("addressed").pipe(Flag.withMetavar("text"), Flag.withDescription("The addressed: text."))), actor: Flag.optional(Flag.String("actor").pipe(Flag.withMetavar("text"), Flag.withDescription("The actor: text."))), channel: Flag.String("channel").pipe(Flag.withMetavar("text"), Flag.withDescription("Trigger channel: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.trigger.receive), Output.answer(json)),
).pipe(Command.withDescription("Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept. Creates a trigger, which starts stored."));
