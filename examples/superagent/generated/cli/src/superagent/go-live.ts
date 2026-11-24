// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/superagent/go-live.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Let a superagent act: a person, after reading what it would have accepted. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const goLive = Command.make(
  "go-live",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Superagent id: an id (sag_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.superagent.goLive), Output.answer(json)),
).pipe(Command.withDescription("Let a superagent act: a person, after reading what it would have accepted. Moves a superagent from observing to live."));
