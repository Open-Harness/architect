import { Blueprint } from "orthograph";
import lanes from "../../things/lane/verbs/list.ts";
import tasks from "../../things/task/verbs/list.ts";
import move from "../../things/task/verbs/move.ts";
import create from "../../things/task/verbs/create.ts";

// The board (docs/screens.md: Adapt, from `kanban-board`). UI SDK has no kanban (K24), so it is a composite: the
// wiring is generated (K36), the behaviour is hand-written on `createReorder` and `createTransfer`.
// GAP composites: K36's wiring projection and `ortho add component` are not built.
export default Blueprint.component({
  description: "A manager's tasks in its lanes. Moving a card asks first where its lane says so.",
  shows: [lanes, tasks],
  offers: [move, create],
});
