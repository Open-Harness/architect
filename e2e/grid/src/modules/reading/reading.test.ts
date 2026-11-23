// The readers every eval shares, tried on Plugged In's real docs page and portal page, and on small pages for the edges.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import { Reading } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const page = pluggedIn.files["generated/docs/link/remove.md"]!;

describe("a docs page", () => {
  it("is read by its sections, tables and bullets", () => {
    expect(Reading.mdSection(page, "Payload")).toBe("| field | value |\n|---|---|\n| link | link.id |");
    expect(Reading.mdRows(Reading.mdSection(page, "Refusals")!).map((r) => r.slice(0, 3))).toEqual([["LinkNotListed", "31", "LN-900"], ["NotAllowed", "3", "AR-001"]]);
    expect(Reading.mdBullets(Reading.mdSection(page, "Steps")!)).toEqual(["link.remove.record (database)"]);
    expect(Reading.mdSection(page, "Nothing here")).toBeUndefined();
  });
  it("does not mistake a heading that starts the same for the section", () => {
    expect(Reading.mdSection("## Moves\nx\n## Move\ny", "Move")).toBe("y");
  });
});

describe("formatting and whole names", () => {
  it("plain takes inline Markdown off: emphasis, code, links and escapes, but not an underscore inside a name", () => {
    expect(Reading.plain("**Move** _from_ `to` [Emits](e.md) a\\|b link_add")).toBe("Move from to Emits a|b link_add");
    expect(Reading.mdRows("| **a** | b |\n|---|---|\n| **x** \\| y | `z` |")).toEqual([["x | y", "z"]]);
    expect(Reading.mdRecords("| **Move** | _To_ |\n|---|---|\n| add | listed |")).toEqual([{ move: "add", to: "listed" }]);
    expect(Reading.mdSection("## **Machine** ##\nbody\n## Next", "Machine")).toBe("body");
    expect(Reading.mdTitle("# `link.remove`\n")).toBe("link.remove");
  });
  it("hasName matches a whole name only: not inside a hyphenated, dotted or longer one", () => {
    expect(Reading.hasName("states: listed, removed.", "removed")).toBe(true);
    expect(Reading.hasName("un-listed", "listed")).toBe(false);
    expect(Reading.hasName("link.add.record", "link.add")).toBe(false);
    expect(Reading.hasName("see link.add.", "link.add")).toBe(true);
    expect(Reading.hasName("LinkAdded2", "LinkAdded")).toBe(false);
    expect(Reading.hasName("x.listed", "listed")).toBe(false);
  });
  it("TypeScript is read as TypeScript: types, exports and classes in any syntax, comments never", () => {
    expect(Reading.exportedTypes('export interface A { state: "x" | "y"; id: string }\nexport enum B { C = "z" }\n// export type D = "q"\nexport type E = "r"')).toEqual([
      { name: "A", literals: [], stateLiterals: ["x", "y"], members: ["state", "id"], memberTypes: { state: { type: '"x" | "y"', optional: false }, id: { type: "string", optional: false } }, aliasOf: "" },
      { name: "B", literals: ["z"], stateLiterals: [], members: ["C"], memberTypes: {}, aliasOf: "" }, { name: "E", literals: ["r"], stateLiterals: [], members: [], memberTypes: {}, aliasOf: '"r"' },
    ]);
    expect(Reading.exportedNames('export { a as b } from "./a.ts"\nexport * as c from "./c.ts"\nexport * from "./s.ts"\nexport const d = 1\nexport function e() {}')).toEqual([
      { exported: "b", local: "a", from: "./a.ts" }, { exported: "c", local: "*", from: "./c.ts" }, { exported: "*", local: "*", from: "./s.ts" },
      { exported: "d", local: "d", from: undefined }, { exported: "e", local: "e", from: undefined },
    ]);
    expect(Reading.htmlHeadings("<h1 class='x'>a <code>b</code></h1><h2>c</h2><h1>d</h1>", 1)).toEqual(["a b", "d"]);
    expect(Reading.exportedValues("/** One. */\nexport const f = 1\n/**\n * Two\n * lines.\n */\nexport function g() {}").map((v) => v.doc)).toEqual(["One.", "Two\nlines."]);
    expect(Reading.objectRows('export const r = {\n  A: { code: "X", exit: 3 },\n  B: {\n    code: \'Y\',\n  },\n} as const', "r")).toEqual({ A: { code: "X", exit: 3 }, B: { code: "Y" } });
    expect(Reading.code("const a = 1 // note\n/* b */ const c = 2")).not.toMatch(/note|\/\*/);
  });
});

describe("a portal page", () => {
  const html = pluggedIn.portal["/portal/operations/link.remove"]!;
  it("is judged on its own part: the docs it embeds are cut off", () => {
    expect(html).toContain("<h2>Docs</h2>");
    expect(Reading.portalOwn(html)).not.toContain("<h2>Docs</h2>");
    expect(Reading.portalOwn(html)).not.toContain("How to call");
    expect(Reading.portalOwn("<h1>x</h1>")).toBe("<h1>x</h1>");
  });
  it("is read by its sections, rows and items", () => {
    const own = Reading.portalOwn(html);
    expect(Reading.htmlRows(Reading.htmlSection(own, 3, "Payload")!)).toEqual([["link", "link.id", "prefix \"lnk\""]]);
    expect(Reading.htmlItems(Reading.htmlSection(own, 3, "Refusals")!)).toEqual(["LinkNotListed", "NotAllowed"]);
    expect(Reading.htmlItems(Reading.htmlSection(own, 3, "Steps")!)).toEqual(["link.remove.record (database)"]);
    expect(Reading.htmlText(Reading.htmlSection(own, 2, "Contract")!)).toContain("Budget: p95 150ms");
    expect(Reading.htmlSection(own, 3, "Nothing here")).toBeUndefined();
  });
  it("ends a section at the next heading of its own level or a higher one, not at a lower one", () => {
    const html2 = "<h2>A</h2><p>a</p><h3>B</h3><p>b</p><h2>C</h2><p>c</p>";
    expect(Reading.htmlSection(html2, 2, "A")).toBe("<p>a</p><h3>B</h3><p>b</p>");
    expect(Reading.htmlSection(html2, 3, "B")).toBe("<p>b</p>");
  });
  it("reads no text out of a script or a style: a page shows what a person reads, not its search index", () => {
    const index = '<script type="application/json" data-portal="search-index">[{"kind":"journey","name":"a name is claimed once"}]</script>';
    const page = `<style>.a-name-is-claimed-once{color:red}</style><h1>handle</h1><p>no journey here</p>${index}`;
    expect(Reading.htmlText(page)).not.toContain("a name is claimed once");
    expect(Reading.htmlText(page)).not.toContain("color:red");
    expect(Reading.htmlText(page)).toBe("handle no journey here");
    expect(Reading.htmlText(page.replace("no journey here", "a name is claimed once"))).toContain("a name is claimed once");
    expect(Reading.htmlText(`<SCRIPT>x one</SCRIPT ><p>kept</p><script src="a.js"></script>`)).toBe("kept");
    expect(Reading.htmlLines(`<ul><li>real</li></ul>${index}`)).toEqual(["- real"]);
  });
  it("turns entities back into text", () => {
    expect(Reading.htmlText("<p>can&#39;t &amp; won&#39;t &lt;x&gt;</p>")).toBe("can't & won't <x>");
  });
});

describe("prove's lines and the spans", () => {
  const prove = pluggedIn.prove!;
  it("a line is proved only when it has a tick, whatever follows it", () => {
    expect(Reading.proved(prove, "link.order who may call")).toEqual([]);
    expect(Reading.proved(prove, "link.order performance")).toEqual([]);
    expect(Reading.proved(prove, "link.order dancing")).toEqual(['prove did not report "link.order dancing ✔"']);
    expect(Reading.proved({ ...prove, lines: ["x steps ✘ one failed"] }, "x steps")).toEqual(['prove did not report "x steps ✔"']);
    expect(Reading.proved(undefined, "x steps")).toEqual(['no prove run was read, so "x steps" is not known']);
  });
  it("spans are found by their exact name", () => {
    expect(Reading.spansNamed(pluggedIn.spans!, "link.add").every((s) => s.name === "link.add")).toBe(true);
    expect(Reading.spansNamed(pluggedIn.spans!, "link.ad")).toEqual([]);
  });
  it("a finding is ok exactly when it has no problems", () => {
    expect(Reading.finding([])).toEqual({ ok: true, why: [] });
    expect(Reading.finding(["a"])).toEqual({ ok: false, why: ["a"] });
  });
});
