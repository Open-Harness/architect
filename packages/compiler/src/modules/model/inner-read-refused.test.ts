// #1079: an operation step runs an operation of the app. A read is a verb but no operation (it has no commit to share), so running one as an operation
// step is refused, as one that is no verb of the app is. The scratch ledger is ./testing.ts.
import { describe, expect, it } from "vitest";
import { LEDGER, modelOf, problemsOf } from "./testing.ts";

describe("#1079: a read is no inner operation", () => {
  it("refuses an operation step that runs a read declared in a verb file, naming the read", async () => {
    const look = `import { Blueprint } from "orthograph";
import { Entry } from "../thing.ts";
export default Blueprint.read(Entry, { by: "id", fields: ["id"], allowed: [Blueprint.signedIn] });
`;
    const peek = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import look from "../../entry/verbs/look.ts";
export default Blueprint.operation(Run, {
  description: "Run a read as a step.", payload: { run: Run.fields.id }, answer: {}, allowed: [Blueprint.signedIn],
  steps: { look: Blueprint.step.operation(look as never) },
});
`;
    const exit = await modelOf({ ...LEDGER, "things/entry/verbs/look.ts": look, "things/run/verbs/peek.ts": peek });
    const problems = problemsOf(exit);
    expect(problems, problems.join("\n")).toHaveLength(1);
    expect(problems[0]).toMatch(/^blueprint\/things\/run\/verbs\/peek\.ts: step look runs entry\.look, a read, which is no operation of the app/);
  });
});
