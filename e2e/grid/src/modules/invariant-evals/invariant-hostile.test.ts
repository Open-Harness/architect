// The hostile pass on the invariant row (author skill step 6): a reviewer who did not write the evals tried to pass each with a wrong output. Every one that passed is planted here, and is red.
// Forms no generator emits are not here: they are the README's "Known gaps" (G7, scope call 4).
import { describe, expect, it } from "vitest";
import type { ProjectEvidence } from "../project-evidence/types.ts";
import { editSpans, judge } from "../project-evidence/testing.ts";
import { InvariantEvals } from "./service.ts";
import { sentenceProblems, spaced, type Found } from "./internal/over.ts";
import { OperationEvals } from "../operation-evals/service.ts";
import { standIn, withModel, withOperation, withPage, withRule, withText } from "./testing.ts";

const pluggedIn = await standIn();
const check = (cell: string, subject: string, e: ProjectEvidence) => judge(InvariantEvals.evals, `invariant.${cell}`, subject, e);
/** Red, and one of the lines says `text`. */
const red = (cell: string, subject: string, e: ProjectEvidence, text: string) => {
  const found = check(cell, subject, e);
  expect(found.ok, `${cell} ${subject} judged a wrong output green`).toBe(false);
  expect(found.ok ? [] : found.why.join("\n")).toContain(text);
};
const T = "handle.oneHolderPerName";
const O = "handle.oneNamePerPerson";
const sql = "generated/server/migrations/0001_things.sql";
const index = /CREATE UNIQUE INDEX "handle_oneHolderPerName"[^\n]*\n/;

describe("hostile pass: model", () => {
  it("an operation that maps another refusal to the rule, or an extra one the rule never owned", () => {
    red("model", T, withOperation(pluggedIn, "handle.release", (o) => ({ ...o, invariants: { HandleNotClaimed: T } })), "handle.release maps HandleNotClaimed to the rule, which refuses HandleTaken");
    red("model", T, withOperation(pluggedIn, "handle.claim", (o) => ({ ...o, invariants: { ...o.invariants, NotAllowed: T } })), "handle.claim maps NotAllowed to the rule");
  });
  it("a scope that repeats a state, or is not a list", () => {
    red("model", T, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, while: ["claimed", "claimed"] })), "twice");
    red("model", T, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, while: null as never })), "not a list");
  });
});

describe("hostile pass: api and sdk", () => {
  const errors = "generated/api/src/errors.ts";
  it("a refusal class re-tagged, a class that is not a tagged error, a code in the table that is not the model's", () => {
    for (const cell of ["api", "sdk"]) {
      red(cell, T, withText(pluggedIn, errors, '()("HandleTaken",', '()("Other",'), "not a tagged error of its own name");
      red(cell, T, withText(pluggedIn, errors, /export class HandleTaken extends Schema\.TaggedError<HandleTaken>\(\)/, "export class HandleTaken extends Schema.Class<HandleTaken>(\"x\")"), "not a tagged error of its own name");
    }
    red("api", T, withText(pluggedIn, errors, 'HandleTaken: { code: "HN-001"', 'HandleTaken: { code: "ZZ-999"'), "the table says ZZ-999 for HandleTaken, the model says HN-001");
  });
});

describe("hostile pass: server", () => {
  it("an index only in a comment, dropped by a later migration, over a column that is not only a quoted name", () => {
    red("server", T, withText(pluggedIn, sql, index, "-- $&"), 'no unique index "handle_oneHolderPerName"');
    red("server", T, withText(pluggedIn, sql, index, "/* $& */\n"), 'no unique index "handle_oneHolderPerName"');
    red("server", T, { ...pluggedIn, files: { ...pluggedIn.files, "generated/server/migrations/0002_x.sql": 'DROP INDEX "handle_oneHolderPerName";\n' } }, 'a migration drops the index "handle_oneHolderPerName"');
    red("server", T, withText(pluggedIn, sql, 'ON "handle" ("name") WHERE', 'ON "handle" ("name", owner) WHERE'), "each a quoted column and nothing more");
    red("server", T, withText(pluggedIn, sql, 'ON "handle" ("name") WHERE', 'ON "handle" ("name" COLLATE NOCASE) WHERE'), "each a quoted column and nothing more");
    red("server", T, withText(pluggedIn, sql, 'ON "handle" ("name") WHERE', 'ON "handle" ("name" DESC) WHERE'), "each a quoted column and nothing more");
  });
  it("a served map written in a comment above the real serve, which has none", () => {
    const main = "generated/server/main.ts";
    const stripped = withText(pluggedIn, main, 'invariants: { HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" }, ', "");
    red("server", T, withText(stripped, main, "const handleClaimServed", '// Handlers.serve({ name: "handle.claim", invariants: { HandleTaken: "handle.oneHolderPerName" } });\nconst handleClaimServed'), "is served with {}");
  });
  it("a journey step that expects the refusal from an operation that cannot give it, in the model or in prove", () => {
    const moved = withModel(pluggedIn, (m) => ({ ...m, journeys: Object.fromEntries(Object.entries(m.journeys ?? {}).map(([k, j]) => [k, { ...j, steps: j.steps.map((s) => ((s.checks ?? []).some((c) => c.error === "HandleTaken") ? { ...s, call: { ...s.call!, operation: "profile.get" } } : s)) }])) }));
    red("server", T, moved, "which is no operation that can break the rule");
    const proved = { ...pluggedIn, prove: { ...pluggedIn.prove!, journeys: pluggedIn.prove!.journeys.map((j) => ({ ...j, steps: j.steps.map((s) => (s.name === "a taken name is refused" ? { ...s, operation: "profile.get" } : s)) })) } };
    red("server", T, proved, "prove ran the step");
  });
});

describe("hostile pass: docs", () => {
  const thing = "generated/docs/handle/index.md";
  const bullet = /- `handle\.oneHolderPerName`:[^\n]*\n/;
  it("a bullet that names a key field or a state it does not have", () => {
    red("docs", T, withText(pluggedIn, thing, "Unique on name, while claimed; refused HandleTaken.", "Unique on name, owner, while claimed and released; refused HandleTaken."), "names owner, which is not in its key");
    red("docs", T, withText(pluggedIn, thing, "Unique on name, while claimed; refused HandleTaken.", "Unique on name, while claimed and released; refused HandleTaken."), "names the state released");
  });
  it("the right bullet inside a code fence or a comment is no bullet; a second Invariants section is one too many", () => {
    red("docs", T, withText(pluggedIn, thing, bullet, "```\n$&```\n"), "no bullet for handle.oneHolderPerName");
    red("docs", T, withText(pluggedIn, thing, bullet, "<!--\n$&-->\n"), "no bullet for handle.oneHolderPerName");
    red("docs", T, withText(pluggedIn, thing, "## Events", "## Invariants\n\n- `handle.oneHolderPerName`: wrong.\n\n## Events"), "2 Invariants sections");
  });
  it("a refusals row that says it is by the rule and another", () => {
    red("docs", T, withText(pluggedIn, "generated/docs/handle/claim.md", "; by the rule handle.oneHolderPerName", "; by the rule handle.oneNamePerPerson and handle.oneHolderPerName"), 'does not say "by the rule handle.oneHolderPerName"');
  });
});

describe("hostile pass: mcp", () => {
  it("a generated sentence that the docs do not give, because the docs row is blank, cannot be the same sentence", () => {
    const blank = withText(pluggedIn, "generated/docs/handle/claim.md", /\| HandleTaken \| 10 \| HN-001 \|[^\n]*\n/, "| HandleTaken | 10 | HN-001 | ; by the rule handle.oneHolderPerName |\n");
    red("mcp", T, blank, "docs page has no sentence for HandleTaken");
  });
});

describe("hostile pass: portal", () => {
  const thing = "/portal/things/handle";
  const claim = "/portal/operations/handle.claim";
  const row = /<li data-portal="rule" id="rule-oneHolderPerName".*?<\/li>/;
  it("a rule row, or its sentence, only in a comment", () => {
    red("portal", T, withPage(pluggedIn, thing, row, "<!-- $& -->"), "has 0 rows for handle.oneHolderPerName");
    red("portal", T, withPage(pluggedIn, thing, /<span data-portal="rule-sentence">another claimed[^<]*<\/span>/, "<!-- $& -->"), "has 0 sentences");
  });
  it("a row outside the Rules section", () => {
    const moved = withPage(pluggedIn, thing, row, "");
    red("portal", T, withPage(moved, thing, "</main>", `${pluggedIn.portal[thing]!.match(row)![0]}</main>`), "is not inside the Rules section");
  });
  it("an attribute that is only inside another attribute's value is not an attribute", () => {
    red("portal", T, withPage(pluggedIn, thing, 'data-fields="name"', `data-fields="owner" title='x data-fields="name"'`), 'data-fields is "owner"');
    red("portal", T, withPage(pluggedIn, thing, 'data-fields="name"', `title='x data-fields="name"'`), 'data-fields is ""');
  });
  it("an element before the row that has the id the refusals link to", () => {
    red("portal", T, withPage(pluggedIn, thing, row, '<div id="rule-oneHolderPerName"></div>$&'), "is on more than one element");
  });
  it("a rules stop that names a rule the operation cannot break, an extra refusal wearing the rule, and a link that names another rule", () => {
    red("portal", T, withPage(pluggedIn, claim, 'data-rules="handle.oneHolderPerName,handle.oneNamePerPerson"', 'data-rules="handle.oneHolderPerName,handle.oneNamePerPerson,handle.bogus"'), "the model says the operation can break");
    red("portal", T, withPage(pluggedIn, claim, "</ul>", '<li data-portal="refusal" data-refusal="NotAllowed" data-rule="handle.oneHolderPerName"></li></ul>'), "shows NotAllowed as handle.oneHolderPerName's");
    red("portal", T, withPage(pluggedIn, claim, '>handle.oneHolderPerName</a>', ">handle.oneNamePerPerson</a>"), "it should name handle.oneHolderPerName");
  });
});

describe("hostile pass: telemetry", () => {
  const refused = (s: { readonly attrs: Readonly<Record<string, unknown>> }) => s.attrs["refusal"] === "HandleTaken";
  it("a refused span for another operation, a refusal whose code nobody knows, a deciding line that only mentions the rule", () => {
    red("telemetry", T, editSpans(pluggedIn, (spans) => spans.map((s) => (refused(s) ? { ...s, attrs: { ...s.attrs, operation: "link.add" } } : s))), "for operation link.add, which the model says cannot break the rule");
    const noCode = withModel(pluggedIn, (m) => ({ ...m, refusals: Object.fromEntries(Object.entries(m.refusals).filter(([k]) => k !== "HandleTaken")) }));
    red("telemetry", T, editSpans(noCode, (spans) => spans.map((s) => { if (!refused(s)) return s; const { "refusal.code": _, ...rest } = s.attrs; return { ...s, attrs: rest }; })), "the model has no code for HandleTaken");
    red("telemetry", T, editSpans(pluggedIn, (spans) => spans.map((s) => (refused(s) ? { ...s, attrs: { ...s.attrs, "refusal.log": `handler refused; not ${T}` } } : s))), `should begin "${T}:"`);
  });
  it("is still green for the right run, and the second rule", () => {
    expect(check("telemetry", T, pluggedIn).ok).toBe(true);
    expect(check("telemetry", O, pluggedIn).ok).toBe(true);
  });
});

describe("review findings: a description with a full stop inside, and names that a sentence spells apart", () => {
  const D = "you hold one name. Ask support to change it";
  const described = () => {
    let e = withRule(pluggedIn, "handle", "oneNamePerPerson", (r) => ({ ...r, description: D }));
    e = withText(e, "generated/docs/handle/index.md", "you already hold a name.", `${D}.`);
    e = withText(e, "generated/docs/handle/claim.md", "you already hold a name; by the rule", `${D}; by the rule`);
    const mcp = e.mcp!.map((t) => (t.name === "handle.claim" ? { ...t, description: t.description!.replace("Refuses HandleAlreadyOwned when you already hold a name.", `Refuses HandleAlreadyOwned when ${D}.`) } : t));
    return withPage({ ...e, mcp }, "/portal/things/handle", "you already hold a name", D);
  };
  const tool = (e: ProjectEvidence) => judge(OperationEvals.evals, "operation.mcp", "handle.claim", e);
  it("is green for a written description with a full stop and a space inside, on docs, mcp and operation.mcp", () => {
    const e = described();
    expect(check("docs", O, e)).toEqual({ ok: true, why: [] });
    expect(check("mcp", O, e)).toEqual({ ok: true, why: [] });
    expect(tool(e)).toEqual({ ok: true, why: [] });
  });
  it("is red when the bullet or the tool cuts the description short, or a stray sentence follows it", () => {
    red("docs", O, withText(described(), "generated/docs/handle/index.md", `${D}.`, "you hold one name."), "the rule's description is");
    const extra = { ...described(), mcp: described().mcp!.map((t) => (t.name === "handle.claim" ? { ...t, description: `${t.description} It is fast.` } : t)) };
    const found = tool(extra);
    expect(found.ok).toBe(false);
    expect(found.ok ? "" : found.why.join()).toContain('"It is fast." is not a "Refuses <Error> when <reason>." sentence');
    const short = { ...described(), mcp: described().mcp!.map((t) => (t.name === "handle.claim" ? { ...t, description: t.description!.replace(`${D}.`, "you hold one name.") } : t)) };
    expect(tool(short).ok).toBe(false);
  });
  it("reads kebab and camel case names as the spaced words a sentence uses, on both sides", () => {
    expect(spaced("sign-in")).toBe("sign in");
    expect(spaced("personId")).toBe("person id");
    expect(spaced("signed_in")).toBe("signed in");
    const found = { full: "sign-in.onePerPerson", local: "onePerPerson", thing: { name: "sign-in" }, rule: { kind: "unique", fields: ["personId"], while: ["signed-in"] }, breakers: [] } as unknown as Found;
    expect(sentenceProblems(pluggedIn, found, "another signed in sign in holds this person id", "x")).toEqual([]);
    expect(sentenceProblems(pluggedIn, found, "Another Signed In Sign In holds this Person Id.", "x")).toEqual([]);
    expect(sentenceProblems(pluggedIn, found, "another sign in holds this person id", "x")[0]).toContain("does not name signed-in");
    expect(sentenceProblems(pluggedIn, found, "another signed in sign in holds this person", "x")[0]).toContain("does not name personId");
    expect(sentenceProblems(pluggedIn, found, "another signed in signin holds this person id", "x")[0]).toContain("does not name sign-in");
  });
});
