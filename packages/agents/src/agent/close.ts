import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/close.ts";
import { Agent } from "../../blueprint/things/agent/thing.ts";

const KEPT = 300;

/**
 * Stop an agent's turn for one Assignment and say so: the seat that held it is then free. Every close is acknowledged, whether the agent was working, idle
 * or had never been told; the id is kept as closed, so an opening tell that arrives late is refused, and `current` is cleared when it is this one.
 */
const close: Handler<typeof declaration, Records> = (payload, { subject, move }) =>
  Effect.gen(function* () {
    const agent = subject!;
    const closed = (agent["closed"] ?? []) as ReadonlyArray<string>;
    const records = yield* Records;
    yield* records.update(Agent, payload.agent, {
      closed: closed.includes(payload.assignment) ? closed : [...closed, payload.assignment].slice(-KEPT),
      ...(agent["current"] === payload.assignment ? { current: null } : {}),
    } as never);
    yield* move("idle");
    return {};
  });

export default close;
