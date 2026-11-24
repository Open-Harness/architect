import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/tell.ts";
import { Agent } from "../../blueprint/things/agent/thing.ts";
import { StaleAssignment } from "../../blueprint/things/agent/errors.ts";

/** How many of what it was told, and of the Assignments it closed, an agent keeps: ids never repeat, so the last few hundred are enough. */
const KEPT = 300;

/**
 * Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id, so a second
 * delivery of one id changes nothing. The check is made here, in the agent's own commit (GOAL17-executor-slots, section 5): an opening tell for an
 * Assignment it closed, and a steer for one that is not its current, are refused `StaleAssignment`, and nothing is told.
 */
const tell: Handler<typeof declaration, Records> = (payload, { subject, move }) =>
  Effect.gen(function* () {
    const agent = subject!;
    const told = (agent["told"] ?? []) as ReadonlyArray<{ readonly requestId: string }>;
    if (told.some((t) => t.requestId === payload.requestId)) return {};
    const assignment = payload.assignment;
    if (assignment !== undefined) {
      const closed = (agent["closed"] ?? []) as ReadonlyArray<string>;
      if (payload.opens ? closed.includes(assignment) : agent["current"] !== assignment) return yield* new StaleAssignment({ assignment });
    }
    const records = yield* Records;
    const entry = { requestId: payload.requestId, text: payload.input, assignment: assignment ?? null, how: agent.state === "working" ? "steered" : "submitted" } as const;
    yield* records.update(Agent, payload.agent, { told: [...told, entry].slice(-KEPT), ...(payload.opens && assignment !== undefined ? { current: assignment } : {}) } as never);
    yield* move();
    return {};
  });

export default tell;
