// #1079 (CX-inner-operations): what the compiler refuses of an inner operation: one whose thing lives in another store, a cycle through the steps
// (an operation running itself, or A through B back to A), one that is no verb of the app, and an outer and inner that declare one refusal's name with
// two shapes, naming both operations. The scratch ledger is ./testing.ts. Written by the checks author for Goal 16; the builder never edits this file
// and only removes lines from `expected-failing/inner-operations-refused.txt`.
import { describe, expect, it } from "vitest";
import { ENTRY, LEDGER, RUN_ERRORS, RUN_PAY, modelOf, problemsOf } from "./testing.ts";

describe("#1079: what the compiler refuses of an inner operation", () => {
  it("refuses an inner operation whose thing lives in another store, naming both operations", async () => {
    const exit = await modelOf({
      ...LEDGER,
      "stores/ledger.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.store.database();\n`,
      "things/entry/thing.ts": ENTRY("ledger"),
    });
    // One problem, or one per inner operation: each in pay.ts, naming run.pay and the inner operation it runs.
    const problems = problemsOf(exit);
    expect(problems.length, problems.join("\n")).toBeGreaterThanOrEqual(1);
    for (const p of problems) {
      expect(p).toMatch(/^blueprint\/things\/run\/verbs\/pay\.ts: /);
      expect(p).toContain("run.pay");
      expect(p).toContain("one call commits to one store");
    }
    expect(problems.some((p) => p.includes("entry.draft"))).toBe(true);
  });

  it("refuses an inner operation whose thing lives as actors, naming both operations", async () => {
    const exit = await modelOf({
      ...LEDGER,
      "stores/rooms.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.store.actor();\n`,
      "things/entry/thing.ts": ENTRY("rooms").replace('import ledger from "../../stores/ledger.ts";', 'import rooms from "../../stores/rooms.ts";'),
    });
    const problems = problemsOf(exit).filter((p) => p.startsWith("blueprint/things/run/verbs/pay.ts: "));
    expect(problems.length, problemsOf(exit).join("\n")).toBeGreaterThanOrEqual(1);
    for (const p of problems) expect(p).toContain("one call commits to one store");
    expect(problems.some((p) => p.includes("entry.draft"))).toBe(true);
  });

  it("refuses an operation step on an operation of a chain-stored thing, which reaches only its own store and the account adapter", async () => {
    // Every thing in one chain store, so no store is crossed: the operation step itself is what a contract can't take.
    const vault = `import vault from "../../stores/vault.ts";\n`;
    const inVault = (text: string) => text.replace(/^(import \{ Blueprint \} from "orthograph";\n)/, `$1${vault}`).replace(/(code: "[A-Z]+") \}\);/, "$1, lives: vault });");
    const exit = await modelOf({
      ...LEDGER,
      "stores/vault.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.store.chain.evm();\n`,
      "things/book/thing.ts": inVault(LEDGER["things/book/thing.ts"]),
      "things/entry/thing.ts": inVault(LEDGER["things/entry/thing.ts"]),
      "things/run/thing.ts": inVault(LEDGER["things/run/thing.ts"]),
    });
    const all = problemsOf(exit);
    // The rewrite took: each of the three things lives in the vault.
    for (const t of ["book", "entry", "run"]) expect(inVault(LEDGER[`things/${t}/thing.ts` as keyof typeof LEDGER]), t).toContain("lives: vault });");
    const named = all.filter((p) => p.startsWith("blueprint/things/run/verbs/pay.ts: ") && /\bdraft\b/.test(p) && p.includes("chain"));
    expect(named.length, all.join("\n")).toBeGreaterThanOrEqual(1);
  });

  it("refuses an operation that runs itself through its steps", async () => {
    // The step names the operation object itself, filled in once the operation is made.
    const self = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
const steps: Record<string, unknown> = {};
const op = Blueprint.operation(Run, {
  description: "Run itself.",
  payload: { run: Run.fields.id }, answer: {}, allowed: [Blueprint.signedIn],
  steps: steps as never,
});
steps["again"] = Blueprint.step.operation(op);
export default op;
`;
    const exit = await modelOf({ ...LEDGER, "things/run/verbs/loop.ts": self });
    const problems = problemsOf(exit);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^blueprint\/things\/run\/verbs\/loop\.ts: /);
    expect(problems[0]).toContain("run.loop → run.loop");
  });

  it("refuses a cycle through two operations, A runs B and B runs A, naming the cycle once", async () => {
    // Two verbs that name each other: each module fills its step from the other's once both are loaded.
    const one = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { steps as twoSteps, two } from "./two.ts";
export const steps: Record<string, unknown> = {};
const one = Blueprint.operation(Run, {
  description: "Run two.", payload: { run: Run.fields.id }, answer: {}, allowed: [Blueprint.signedIn], steps: steps as never,
});
steps["two"] = Blueprint.step.operation(two);
twoSteps["one"] = Blueprint.step.operation(one);
export default one;
`;
    const two = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
export const steps: Record<string, unknown> = {};
export const two = Blueprint.operation(Run, {
  description: "Run one.", payload: { run: Run.fields.id }, answer: {}, allowed: [Blueprint.signedIn], steps: steps as never,
});
export default two;
`;
    const exit = await modelOf({ ...LEDGER, "things/run/verbs/one.ts": one, "things/run/verbs/two.ts": two });
    const problems = problemsOf(exit);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/run\.one → run\.two → run\.one|run\.two → run\.one → run\.two/);
  });

  it("refuses an inner operation that is no verb of the app", async () => {
    const stray = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { Entry } from "../../entry/thing.ts";
const loose = Blueprint.operation(Entry, { description: "Not in a verbs file.", payload: {}, answer: {}, allowed: [Blueprint.signedIn] });
export default Blueprint.operation(Run, {
  description: "Run something that isn't a verb.", payload: { run: Run.fields.id }, answer: {}, allowed: [Blueprint.signedIn],
  steps: { loose: Blueprint.step.operation(loose) },
});
`;
    const exit = await modelOf({ ...LEDGER, "things/run/verbs/stray.ts": stray });
    const problems = problemsOf(exit);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^blueprint\/things\/run\/verbs\/stray\.ts: step loose /);
  });

  it("refuses an outer and an inner that declare one refusal's name with two shapes, naming both operations", async () => {
    // The run's own EntryHasNoLines carries a run, not an entry: on the wire the two can't be told apart.
    const exit = await modelOf({
      ...LEDGER,
      "things/run/errors.ts": RUN_ERRORS(`export class EntryHasNoLines extends Blueprint.error({ run: Run.fields.id }, { exit: 54 }) {}\n`),
      "things/run/verbs/pay.ts": RUN_PAY({ errors: "RunTooLarge, EntryHasNoLines" }),
    });
    const problems = problemsOf(exit);
    const named = problems.filter((p) => p.includes("EntryHasNoLines") && p.includes("run.pay") && p.includes("entry.submit"));
    expect(named, problems.join("\n")).toHaveLength(1);
    expect(named[0]).toMatch(/^blueprint\/things\/run\/verbs\/pay\.ts: /);
  });
});
