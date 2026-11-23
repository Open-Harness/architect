// What several journeys write the same way. Pure: each returns a plain payload or a plain model turn, and calls nothing.
import { PLAYBOOK, CONNECTIONS, SLACK_THREAD } from "./consts.ts";

/** An accept's payload (GOAL17-slice5-forms: `ticket.accept` is `listed.of("account")`, so `gh` calls it). `ticket` is a name only: the thread says which. */
export const acceptOf = (s: { world: Record<string, unknown> }, o: { agent: unknown; thread?: string; text?: string; title?: string }) => ({
  superagent: s.world["superagent"], account: s.world["account"], title: o.title ?? "Fix the flaky login test",
  agent: o.agent, thread: o.thread ?? "issue/12", text: o.text ?? "@agent fix the flaky login test",
});

/** A trigger as the source's caller records it: the payload of `trigger.receive` (`channel` is what the source's mapping keeps of where it came from). */
export const triggerOf = (s: { world: Record<string, unknown> }, o: { thread: string; text: string; author: string; event: string }) => ({
  superagent: s.world["superagent"], source: "github", event: o.event, thread: o.thread, kind: "comment", text: o.text, author: o.author,
  channel: { repository: "acme/widgets", number: Number(o.thread.split("/")[1] ?? 0) },
});

/** A scripted tool call and a scripted answer, in the shape of `ModelTurn` (GOAL17-check-harness call 1). */
export const bash = (command: string) => ({ tool: "bash", args: { command } });
export const turnBash = (command: string, hold?: "before-reply" | "after-first-chunk") => ({ call: [bash(command)], ...(hold ? { hold } : {}) });
export const turnSay = (say: string, hold?: "before-reply" | "after-first-chunk") => ({ say, ...(hold ? { hold } : {}) });
export const executorOf = (about: string) => ({ kind: "executor", about });

export { PLAYBOOK, CONNECTIONS, SLACK_THREAD };
