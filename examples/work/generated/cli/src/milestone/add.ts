// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/milestone/add.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const add = Command.make(
  "add",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("Milestone mission: an id (msn_...).")), title: Flag.String("title").pipe(Flag.withMetavar("title"), Flag.withDescription("Milestone title: text of up to 200 characters.")), kinds: Flag.String("kinds").pipe(Flag.withMetavar("task-kinds"), Flag.withDescription("Milestone kinds: text.")), of: Flag.String("of").pipe(Flag.withMetavar("subject"), Flag.withDescription("Milestone of: text of up to 120 characters.")), until: Flag.String("until").pipe(Flag.withMetavar("environment"), Flag.withDescription("Milestone until: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.milestone.add), Output.answer(json)),
).pipe(Command.withDescription("Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. Creates a milestone, which starts active."));
