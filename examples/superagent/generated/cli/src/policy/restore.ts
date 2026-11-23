// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/policy/restore.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Save an earlier version again, as a new one. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const restore = Command.make(
  "restore",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Policy superagent: an id (sag_...).")), revision: Flag.Int("revision").pipe(Flag.map(String), Flag.withDescription("Policy revision: a whole number below 2^32.")), base: Flag.Int("base").pipe(Flag.map(String), Flag.withDescription("The base: a whole number below 2^32.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.policy.restore), Output.answer(json)),
).pipe(Command.withDescription("Save an earlier version again, as a new one. Creates a policy, which starts current."));
