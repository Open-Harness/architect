// Journey-author file (M4.02). acme mounts the agents feature, with room for two runs at once (the pool's size is a
// choice, `pool`: see e2e/agents/feature/README.md, "Names chosen where M4-agents is silent").
import { Blueprint } from "orthograph";
import { agents } from "@orthograph/agents";

export default Blueprint.use(agents, (a) => [a.choose(a.pool, 2)]);
