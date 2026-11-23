import type { Incoming, ModelTurn, ScriptApi, ScriptState, Taken, Who } from "./types.ts";
import { fill } from "./internal/fill.ts";

/** A tool's name as the model is offered it: Pi may write a dot as an underscore, so the two compare alike. */
const alike = (name: string) => name.replaceAll(".", "_");

const kindOf: ScriptApi["kindOf"] = (model) => (model.includes("executor") ? "executor" : model.includes("main") ? "main" : undefined);

const matches = (who: Who, incoming: Incoming): boolean =>
  (who.kind === undefined || kindOf(incoming.model) === who.kind)
  && (who.about === undefined || incoming.about === who.about)
  && (who.agent === undefined || incoming.agent === who.agent);

const unusedOf = (state: ScriptState): ReadonlyArray<ModelTurn> => state.scripts.flatMap((s) => s.turns.slice(s.used));

export const Script: ScriptApi = {
  empty: { scripts: [], seen: [] },

  add: (state, spec) => {
    const id = `scr_${state.scripts.length + 1}`;
    return [{ ...state, scripts: [...state.scripts, { id, for: spec.for, turns: spec.turns, used: 0 }] }, id];
  },

  take: (state, incoming) => {
    const n = state.seen.length + 1;
    const at = state.scripts.findIndex((s) => s.used < s.turns.length && matches(s.for, incoming));
    const record = (answered: "scripted" | "no-script" | "tool-not-offered", scripts = state.scripts) => ({ scripts, seen: [...state.seen, { ...incoming, n, answered }] });
    if (at < 0) return [record("no-script"), { kind: "no-script", n } as Taken];
    const script = state.scripts[at]!;
    const turn = script.turns[script.used]!;
    const offered = new Set(incoming.tools.map(alike));
    const missing = turn.call?.find((c) => !offered.has(alike(c.tool)));
    // A script can never call what the agent lacks: the turn stays unused, so `done` fails too.
    if (missing !== undefined) return [record("tool-not-offered"), { kind: "tool-not-offered", n, tool: missing.tool } as Taken];
    const used = state.scripts.map((s, i) => (i === at ? { ...s, used: s.used + 1 } : s));
    return [record("scripted", used), { kind: "turn", n, turn } as Taken];
  },

  record: (state, incoming, answered) => {
    const n = state.seen.length + 1;
    return [{ ...state, seen: [...state.seen, { ...incoming, n, answered }] }, n];
  },

  kindOf,
  unused: unusedOf,

  asked: (state, { containing, since = 0, nth }) =>
    state.seen.filter((r) => r.n > since && (nth === undefined || r.n === nth) && (containing === undefined || r.text.includes(containing))),

  chunks: (turn, incoming, id) => {
    const calls = (turn.call ?? []).map((c, index) => ({
      index, id: `call_${id}_${index}`, type: "function",
      function: { name: incoming.tools.find((t) => alike(t) === alike(c.tool)) ?? c.tool, arguments: JSON.stringify(fill(c.args, incoming)) },
    }));
    const chunk = (delta: object, finish: string | null) =>
      `data: ${JSON.stringify({ id: `chatcmpl-${id}`, object: "chat.completion.chunk", created: 1, model: incoming.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
    return {
      first: chunk({ role: "assistant", ...(turn.say === undefined ? {} : { content: turn.say }), ...(calls.length === 0 ? {} : { tool_calls: calls }) }, null),
      rest: `${chunk({}, calls.length > 0 ? "tool_calls" : "stop")}data: [DONE]\n\n`,
    };
  },
};
