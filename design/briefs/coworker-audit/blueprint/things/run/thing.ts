import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Task } from "../task/thing.ts";
import { Body, Note, Report } from "../../values/coworker.ts";

// What model-next.md calls a Session and screens.md calls a thread: "every thread is a fork and its own agent".
export const Run = Blueprint.thing({
  description: "One agent working one task: its brief, what it last reported, and the conversation it works in.",
  fields: {
    id: Blueprint.id("run"),
    manager: Manager.fields.id,
    task: Task.fields.id,
    from: Blueprint.optional(Blueprint.id("run")), // the thread it forked from, so threads draw as a tree
    agent: Blueprint.id("agt"),
    role: Blueprint.text({ max: 60 }),
    brief: Body,
    report: Blueprint.optional(Report),
    note: Blueprint.optional(Note),
  },
  code: "RN",
});
// GAP transcript: the turns, tool calls and the streaming line live in Pi's store inside the Agent's actor.
// Nothing in Orthograph reads them out as a read, a page or a trace yet.
