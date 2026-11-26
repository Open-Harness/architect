// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/personal-safe/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open your own Safe. It has no address until you claim it with the key you sign with. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.personalSafe.open), Output.answer(json)),
).pipe(Command.withDescription("Open your own Safe. It has no address until you claim it with the key you sign with. Creates a personal safe, which starts unclaimed."));
