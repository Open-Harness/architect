// Check 15 (Goal 17 slice 5): the misuse the records say `ortho check` refuses, each with a named problem. Every refusal here
// is one a record states; nothing is added. Each case plants one fault in a copy of the app (or, for a derive, in a small
// probe the check writes with only `orthograph`), and expects `ortho check` to exit non-zero with the file and the words
// the README lists. A fault is planted only where the unplanted copy passes (check 08, and each probe's own control),
// so a refusal can't be for another reason; faults that TypeScript would catch are written past it (`as any`), so the
// model's own check is what refuses.
//
//   derive:   GOAL17-derived-reads, "What it touches": "five new refusals: a look's `by` is not the root's id, a look at an
//             actor thing, an `adds` name that is a stored field, `where` names neither, `max` outside 1 to 100"
//   hold:     GOAL17-pause, "What the app lists as held": a delivery in neither list, one event on both lists, a held row whose
//             event is one of the hold thing's own moves
//   sources:  GOAL17-source-from, "The compiler binds the mapping to the adapter": an event the adapter does not have; an
//             active source whose mount does not include an event or a call it uses
//   actor:    GOAL17-source-from, "Account (K40 fix 1)": an operation that uses `listed.of("account")` with no `superagent` to compare
//   id:       GOAL17-executor-slots: "the compiler refuses a prefix that names no thing's own id"
import { afterEach, describe, expect, it } from "vitest";
import { check, copyApp, edit, removeCopies, run, swapPlugin, write } from "./app.ts";

afterEach(removeCopies);

/** `ortho generate`, then `ortho check`, on a copy: what a developer runs; the refusal may come from either. */
const verdict = (root: string) => {
  const g = run(root, ["generate"]);
  const c = check(root);
  return { passes: g.status === 0 && c.status === 0, out: `${g.out}\n${c.out}` };
};
const refused = (root: string, ...mentions: ReadonlyArray<string | RegExp>) => {
  const v = verdict(root);
  expect(v.passes, `ortho check should refuse:\n${v.out}`).toBe(false);
  expect(v.out, "the refusal is the model's own: the file was written past TypeScript, so a TS error would be another reason").not.toMatch(/\bTS\d{4}\b/);
  for (const m of mentions) expect(v.out, `the refusal should mention ${String(m)}`).toMatch(typeof m === "string" ? new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : m);
};

// ---- derive: a probe with only `orthograph` in it ------------------------------------------------------------------
const THING = (n: string, prefix: string, more: string, lives = "", imports = "") =>
  `import { Blueprint } from "orthograph";\n${imports}export const ${n} = Blueprint.thing({ description: "A thing the check plants.", ${lives}fields: { id: Blueprint.id("${prefix}"), ${more} } });\n`;
interface Probe { readonly look?: string; readonly adds?: string; readonly is?: string; readonly list?: string; readonly part?: string; readonly lives?: string }
const probe = (root: string, p: Probe = {}) => {
  write(root, "blueprint/things/probe/thing.ts", THING("Probe", "prb", `title: Blueprint.text()`));
  write(root, "blueprint/things/probe-part/thing.ts", THING("Part", "prt", `probe: Probe.fields.id, note: Blueprint.text()`, p.lives ?? "", `import { Probe } from "../probe/thing.ts";\n`));
  write(root, "blueprint/things/probe/derive.ts", `import { Blueprint } from "orthograph";
import { Probe } from "./thing.ts";
import { Part } from "../probe-part/thing.ts";
export const Look = Blueprint.derive(Probe, {
  looks: { part: ${p.look ?? "Blueprint.newest(Part, { by: Part.fields.probe })"} },
  adds: ${p.adds ?? `{ verdict: Blueprint.text({ max: 40 }) }`},
  is: () => (${p.is ?? `{ verdict: "fine" }`}) as never,
});
`);
  write(root, "blueprint/things/probe/verbs/look.ts", `import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { Look } from "../derive.ts";
export default Blueprint.read(Probe, { by: "id", fields: ["title"], derive: Look, allowed: [Blueprint.signedIn] });
`);
  write(root, "blueprint/things/probe/verbs/list.ts", `import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { Look } from "../derive.ts";
export default Blueprint.read(Probe, { where: [${p.list ?? `"verdict"`}], derive: Look, order: "newest", page: 10, allowed: [Blueprint.signedIn] });
`);
};

describe("15 derive: (GOAL17-derived-reads) the five refusals, each against a probe that passes without it", () => {
  it("control: the probe, written as the record writes a derive, passes `ortho check`", () => {
    const root = copyApp();
    probe(root);
    const v = verdict(root);
    expect(v.passes, `the unfaulted probe should pass:\n${v.out}`).toBe(true);
  });

  it("a look whose `by` is not a field holding the root's id is refused, naming the look and the field", () => {
    const root = copyApp();
    probe(root, { look: "Blueprint.newest(Part, { by: Part.fields.note })" });
    refused(root, "blueprint/things/probe/verbs/look.ts", "part", "note");
  });

  it("a look at a thing that lives as actors is refused, naming the look and the thing", () => {
    const root = copyApp();
    probe(root, { lives: `lives: "actor", ` });
    refused(root, "blueprint/things/probe/verbs/look.ts", "part", "probe-part");
  });

  it("an `adds` name that is a stored field of the root is refused, naming it", () => {
    const root = copyApp();
    probe(root, { adds: `{ title: Blueprint.text({ max: 40 }) }`, is: `{ title: "x" }` });
    refused(root, "blueprint/things/probe/verbs/look.ts", "title");
  });

  it("a list read's `where` that names neither a stored field nor a derived one is refused, naming it", () => {
    const root = copyApp();
    probe(root, { list: `"nope" as never` });
    refused(root, "blueprint/things/probe/verbs/list.ts", "nope");
  });

  it.each([["101", "above"], ["0", "below"]])("a look's `max` of %s, %s the range 1 to 100, is refused, naming it", (max) => {
    const root = copyApp();
    probe(root, { look: `Blueprint.all(Part, { by: Part.fields.probe, max: ${max} })` });
    refused(root, "blueprint/things/probe/verbs/look.ts", "max", max);
  });

  it("control for `max`: 1 and 100 are inside the range, and pass", () => {
    for (const max of ["1", "100"]) {
      const root = copyApp();
      probe(root, { look: `Blueprint.all(Part, { by: Part.fields.probe, max: ${max} })` });
      const v = verdict(root);
      expect(v.passes, `max ${max} is in range:\n${v.out}`).toBe(true);
    }
  });
});

// ---- hold: the app's own `pausable` lists ----------------------------------------------------------------------------
const FEATURE = "blueprint/features/superagent.ts";
const entry = (event: string, to: string) => new RegExp(`\\{[^{}]*\\bevent:\\s*[\\w.]*\\b${event}\\b[^{}]*\\bto:\\s*[\\w.]*${to}[^{}]*\\}\\s*,?`, "s");
/** Every row of one event, whatever it is delivered to. */
const entries = (event: string) => new RegExp(`\\{[^{}]*\\bevent:\\s*[\\w.]*\\b${event}\\b[^{}]*\\}\\s*,?`, "gs");
const withLine = (list: "held" | "unheld", line: string) => (text: string) => text.replace(new RegExp(`(\\b${list}:\\s*\\[)`), `$1\n    ${line},`);

describe("15 hold: (GOAL17-pause) the lists of what the switch holds", () => {
  it("a delivery of an event that carries `superagent`, in neither list, is refused, naming the event and where it is delivered: `AssignmentEnded` to `input.route` is dropped, and `AssignmentEnded` to `fill` stays listed", () => {
    const root = copyApp();
    edit(root, FEATURE, (t) => t.replace(entry("AssignmentEnded", "input\\.operations\\.route"), ""));
    refused(root, FEATURE, "AssignmentEnded", /input\.route|input\.operations\.route|route/);
  });

  it("one event with deliveries on both lists is refused, naming the event: `AssignmentEnded` to `input.route` is moved to unheld, `AssignmentEnded` to `fill` stays held", () => {
    const root = copyApp();
    edit(root, FEATURE, (t) => withLine("unheld", `{ event: tickets.events.AssignmentEnded, to: input.operations.route, reason: "planted by check 15" }`)(t.replace(entry("AssignmentEnded", "input\\.operations\\.route"), "")));
    refused(root, FEATURE, "AssignmentEnded");
  });

  it("a held delivery of the hold thing's own move, `SuperagentResumed`, is refused, though no other rule is broken: every unheld row of it goes, and one held row takes its place", () => {
    const root = copyApp();
    edit(root, FEATURE, (t) => withLine("held", `{ event: superagent.events.SuperagentResumed, to: superagent.operations.fill }`)(t.replace(entries("SuperagentResumed"), "")));
    refused(root, FEATURE, "SuperagentResumed", /own move|deadlock|resume/i);
  });
});

// ---- sources: the mount and the mapping --------------------------------------------------------------------------------
describe("15 sources: (GOAL17-source-from) a source and the mount it maps over", () => {
  it("a mount that leaves out an event its source maps is refused: the message names the mount's file, the event, the source and the line to add", () => {
    const root = copyApp();
    edit(root, "blueprint/adapters/github.ts", (t) => t.replace(/^.*\w+\.include\(\w+\.events\.issueComment\).*\n/m, ""));
    refused(root, "blueprint/adapters/github.ts", "does not include", "events.issueComment", "githubSource", /\.include\(\w+\.events\.issueComment\)/);
  });

  it("a mount that leaves out a call its source replies with is refused the same way", () => {
    const root = copyApp();
    edit(root, "blueprint/adapters/github.ts", (t) => t.replace(/^.*\w+\.include\(\w+\.calls\.issues\.createComment\).*\n/m, ""));
    refused(root, "blueprint/adapters/github.ts", "does not include", "calls.issues.createComment", "githubSource", /\.include\(\w+\.calls\.issues\.createComment\)/);
  });

  it("a mapping of an event the adapter does not have is refused, named, even where TypeScript was bypassed", () => {
    const root = copyApp();
    swapPlugin(root, "intake", (dir) => edit(dir, "blueprint/sources/github.ts", (t) => t.replace(/\bon:\s*\{/, `on: {\n    issueComent: (() => undefined) as any,`)));
    refused(root, "issueComent", /doesn't have|does not have/);
  });
});

// ---- actor: a listed account, and the superagent it is listed for -------------------------------------------------------------
describe("15 actor: (GOAL17-source-from) the role compares the call's superagent to the account's", () => {
  it("`ticket.accept`, which uses `listed.of(\"account\")`, with no `superagent` in its payload to compare, is refused", () => {
    const root = copyApp();
    swapPlugin(root, "tickets", (dir) => edit(dir, "blueprint/things/ticket/verbs/accept.ts", (t) => t.replace(/(payload:\s*\{[^}]*?)\n\s*superagent:[^\n]*/s, "$1")));
    refused(root, "ticket.accept", "superagent");
  });
});

// ---- id: a reference's prefix ----------------------------------------------------------------------------------------------------
describe("15 id: (GOAL17-executor-slots) a reference names a prefix some thing owns", () => {
  it("`Blueprint.id(\"sag\")` is Superagent's own prefix; a prefix no thing owns is refused, naming it", () => {
    const root = copyApp();
    swapPlugin(root, "tickets", (dir) => edit(dir, "blueprint/things/assignment/thing.ts", (t) => t.replace(/Blueprint\.id\("sag"\)/, `Blueprint.id("zzz")`)));
    refused(root, "zzz");
  });
});
