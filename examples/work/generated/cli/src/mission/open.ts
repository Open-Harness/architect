// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { title: Flag.String("title").pipe(Flag.withMetavar("title"), Flag.withDescription("Mission title: text of up to 200 characters.")), target: Flag.String("target").pipe(Flag.withMetavar("environment"), Flag.withDescription("Mission target: text.")), blueprint: Flag.String("blueprint").pipe(Flag.withMetavar("digest"), Flag.withDescription("Mission blueprint: text of up to 64 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.open), Output.answer(json)),
).pipe(Command.withDescription("Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. Creates a mission, which starts intake."));
