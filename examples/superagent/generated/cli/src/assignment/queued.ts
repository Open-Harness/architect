// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/assignment/queued.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const queued = Command.make(
  "queued",
  { superagent: Flag.String("superagent").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment superagent: an id (sag_...).")), ticket: Flag.String("ticket").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment ticket: an id (tkt_...).")), agent: Flag.String("agent").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment agent: an id (agt_...).")), input: Flag.String("input").pipe(Flag.withMetavar("id"), Flag.withDescription("Assignment input: an id (inp_...).")), why: Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("Assignment why: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.assignment.queued), Output.answer(json)),
).pipe(Command.withDescription("Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it. Creates an assignment, which starts pending."));
