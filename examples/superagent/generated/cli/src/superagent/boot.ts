// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/superagent/boot.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const boot = Command.make(
  "boot",
  { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.superagent.boot), Output.answer(json)),
).pipe(Command.withDescription("The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost."));
