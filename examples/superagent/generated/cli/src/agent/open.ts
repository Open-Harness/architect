// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/agent/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Make an agent of one kind, about one thing: any operation allowed to create one makes it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { kind: Flag.String("kind").pipe(Flag.withMetavar("text"), Flag.withDescription("Agent kind: text of up to 40 characters.")), about: Flag.String("about").pipe(Flag.withMetavar("text"), Flag.withDescription("Agent about: text of up to 120 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.agent.open), Output.answer(json)),
).pipe(Command.withDescription("Make an agent of one kind, about one thing: any operation allowed to create one makes it. Creates an agent, which starts idle."));
