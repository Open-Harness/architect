// Journey-author file (M4.02). An agent with no tools: it answers the brief, so a run of it is one model request.
import { Blueprint } from "orthograph";

export default Blueprint.agent({
  instructions: "./notes.md",
  operations: [],
  limits: { maxTurns: 4, maxUsd: 1, wall: "5 minutes" },
});
