// Check 12 (Goal 17 slice 5): @orthograph/prompts, the PromptSet, is in examples/superagent's model and generated docs,
// CLI and MCP. A PromptSet has versions (17-superagent.md, the PromptSet row; K40 fix 2).
import { afterAll, describe, expect, it } from "vitest";
import { build, lazy, removeCopies } from "./app.ts";
import { prompts } from "./blueprint-names.ts";
import { describePlugin } from "./names-check.ts";

describePlugin("12", prompts);

describe("12 @orthograph/prompts: what only this plugin's design says", () => {
  const built = lazy(build);
  afterAll(removeCopies);

  it("PromptSet has versions, and the key is one of its own fields", () => {
    const set = built().model["things"]["prompt-set"];
    expect(typeof set?.versions?.key, "versions: { key } in the model").toBe("string");
    expect(set?.fields?.[set.versions.key], "the versions key must be a field of the thing").toBeDefined();
  });

  it("`prompt-set.compose` is the system's, for every model request; a person cannot call it (the PromptSet row)", () => {
    expect(built().model["operations"]["prompt-set.compose"]?.allowed).toEqual([{ kind: "system" }]);
  });
});
