// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/proposal/reject.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Turn a proposal down. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const reject = Command.make(
  "reject",
  { proposal: Flag.String("proposal").pipe(Flag.withMetavar("id"), Flag.withDescription("Proposal id: an id (prp_...).")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.proposal.reject), Output.answer(json)),
).pipe(Command.withDescription("Turn a proposal down. Moves a proposal from waiting to rejected."));
