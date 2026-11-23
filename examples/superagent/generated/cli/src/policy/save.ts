// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/policy/save.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Save a new version of the policy. A save made from an older version is refused, with the current one. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const save = Command.make(
  "save",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Policy superagent: an id (sag_...).")), base: Flag.Int("base").pipe(Flag.map(String), Flag.withDescription("The base: a whole number below 2^32.")), mode: Flag.String("mode").pipe(Flag.withMetavar("text"), Flag.withDescription("Policy mode: text.")), allowed: Flag.String("allowed").pipe(Flag.withMetavar("text"), Flag.withDescription("Policy allowed: text.")), bots: Flag.String("bots").pipe(Flag.withMetavar("text"), Flag.withDescription("Policy bots: text.")), admission: Flag.String("admission").pipe(Flag.withMetavar("text"), Flag.withDescription("Policy admission: text.")), rules: Flag.String("rules").pipe(Flag.withMetavar("text"), Flag.withDescription("Policy rules: text.")), why: Flag.optional(Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("The why: text of up to 2000 characters."))), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.policy.save), Output.answer(json)),
).pipe(Command.withDescription("Save a new version of the policy. A save made from an older version is refused, with the current one. Creates a policy, which starts current."));
