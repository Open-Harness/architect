import { Blueprint } from "orthograph";
import { Title, Note } from "../../values/coworker.ts";

// A row, not an actor: managers are listed, searched and drawn as a tree. Its conversation is an Agent, which is the actor.
export const Manager = Blueprint.thing({
  description: "A co-worker: it has a job, a mission, a board and an address, and it answers to the manager above it.",
  fields: {
    id: Blueprint.id("mgr"),
    workspace: Blueprint.id("org"),
    name: Title,
    job: Note,
    above: Blueprint.optional(Blueprint.id("mgr")), // empty: the root. One per workspace (first-principles 10)
    agent: Blueprint.id("agt"), // its conversation, from @orthograph/agents
    mission: Blueprint.id("pge"),
    address: Blueprint.text({ max: 120 }), // <manager>.<workspace>@<domain>
  },
  versions: { key: "id" }, // "versions kept", and "old and new side by side on the same past cases" (screens.md)
  code: "MG",
});
// GAP trees: "a record under a parent" is provisional (status row `trees`, Capxul's books). `above` works as a plain
// field; rolling numbers up the tree and "one root per workspace" as an invariant do not exist.
