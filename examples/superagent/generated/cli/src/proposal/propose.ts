// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/proposal/propose.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record what a main agent would change, and why: nothing changes until a person approves it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const propose = Command.make(
  "propose",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Proposal superagent: an id (sag_...).")), operation: Flag.String("operation").pipe(Flag.withMetavar("text"), Flag.withDescription("Proposal operation: text of up to 80 characters.")), changes: Flag.String("changes").pipe(Flag.withMetavar("text"), Flag.withDescription("Proposal changes: text.")), why: Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("Proposal why: text of up to 2000 characters.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.proposal.propose), Output.answer(json)),
).pipe(Command.withDescription("Record what a main agent would change, and why: nothing changes until a person approves it. Creates a proposal, which starts waiting."));
