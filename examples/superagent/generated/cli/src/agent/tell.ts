// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/agent/tell.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id. Each flag is handed on as text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const tell = Command.make(
  "tell",
  { agent: Flag.String("agent").pipe(Flag.withMetavar("id"), Flag.withDescription("Agent id: an id (agt_...).")), requestId: Flag.String("requestId").pipe(Flag.withMetavar("text"), Flag.withDescription("The request id: text of up to 120 characters.")), input: Flag.String("input").pipe(Flag.withMetavar("text"), Flag.withDescription("The input: text of up to 65536 characters.")), assignment: Flag.optional(Flag.String("assignment").pipe(Flag.withMetavar("id"), Flag.withDescription("The assignment: an id (asg_...)."))), opens: Flag.String("opens").pipe(Flag.withMetavar("text"), Flag.withDescription("The opens: text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.agent.tell), Output.answer(json)),
).pipe(Command.withDescription("Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id. Moves an agent from idle or working to working."));
