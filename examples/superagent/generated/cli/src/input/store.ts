// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/input/store.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Store a message for a ticket's executor: a person's, or a followed thread's trigger. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const store = Command.make(
  "store",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Input superagent: an id (sag_...).")), ticket: Flag.optional(Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("The ticket: an id (tkt_...)."))), thread: Flag.String("thread").pipe(Flag.withMetavar("text"), Flag.withDescription("The thread: text of up to 200 characters.")), from: Flag.String("from").pipe(Flag.withMetavar("text"), Flag.withDescription("Input from: text.")), text: Flag.String("text").pipe(Flag.withMetavar("text"), Flag.withDescription("Input text: text of up to 65536 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.input.store), Output.answer(json)),
).pipe(Command.withDescription("Store a message for a ticket's executor: a person's, or a followed thread's trigger. Creates an input, which starts waiting."));
