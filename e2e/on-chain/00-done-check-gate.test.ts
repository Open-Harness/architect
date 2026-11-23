// The gates of the done check itself (not a slice's check): `presence.mjs` fails while a slice's check is missing, and `slices.json` names
// every slice from 3 to 12. Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. `nx run e2e:on-chain` is red while any check listed in `slices.json` is not in this folder (a file `NN-<name>.test.ts`
// with a test in it), so "every slice's check is green" cannot pass by there being none. Today it is red for that too.
//
// THE CONTROLS plant each hole against `presenceProblems`: a check file missing, a file with no test, a wrong prefix, a slice dropped from
// the list, a prefix reused or reserved, a list that is not a list.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import list from "./slices.json" with { type: "json" };
import { REQUIRED_SLICES, presenceProblems } from "./presence.mjs";

const dir = mkdtempSync(join(tmpdir(), "ortho-on-chain-presence-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const folder = (name: string, files: Record<string, string>) => {
  mkdirSync(join(dir, name), { recursive: true });
  for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, name, f), text);
  return join(dir, name);
};
const small = { slices: [{ slice: 3, milestone: "M6.10", prefix: "04", what: "x" }, { slice: 4, milestone: "M6.11", prefix: "05", what: "y" }] };
const present = { "04-store.test.ts": 'it("a", () => {});', "05-render.test.ts": 'test("b", () => {});' };
// the controls judge two slices only: `REQUIRED_SLICES` apart, so the list under test names them as required
const only = (l: unknown, d: string) => presenceProblems(d, l).filter((p) => !p.startsWith("slices.json names no check for slice"));

describe("controls: presenceProblems refuses each hole", () => {
  it("accepts every listed check present with a test in it", () => expect(only(small, folder("ok", present))).toEqual([]));
  it("refuses a check missing, a file with no test, and a check of the wrong prefix", () => {
    expect(only(small, folder("m1", { "04-store.test.ts": 'it("a", () => {});' }))).toEqual(["slice 4 (M6.11, y): 05-<name>.test.ts is missing"]);
    expect(only(small, folder("m2", {}))).toHaveLength(2);
    expect(only(small, folder("m3", { ...present, "05-render.test.ts": "// nothing here\n" }))).toEqual(["slice 4 (M6.11, y): 05-<name>.test.ts has no test in it"]);
    expect(only(small, folder("m4", { "04-store.test.ts": 'it("a", () => {});', "06-render.test.ts": 'it("b", () => {});' }))).toHaveLength(1);
    expect(only(small, folder("m5", { "04-store.ts": 'it("a")', "05-render.test.ts": 'it("b", () => {});' }))).toHaveLength(1);
  });
  it("refuses a slice dropped from the list, and a list that is not a list", () => {
    for (const n of REQUIRED_SLICES) expect(presenceProblems(folder("all", present), { slices: list.slices.filter((s) => s.slice !== n) })).toContain(`slices.json names no check for slice ${n}`);
    expect(presenceProblems(folder("none", present), {}).length).toBeGreaterThanOrEqual(REQUIRED_SLICES.length);
    expect(presenceProblems(folder("null", present), null).length).toBeGreaterThanOrEqual(REQUIRED_SLICES.length);
  });
  it("refuses a reused or reserved prefix, and a missing folder", () => {
    expect(only({ slices: [{ slice: 3, prefix: "04" }, { slice: 4, prefix: "04" }] }, folder("p1", present))).toContain("slices.json gives the prefix 04 twice");
    expect(only({ slices: [{ slice: 3, prefix: "01" }] }, folder("p2", present)).length).toBeGreaterThan(0);
    expect(only({ slices: [{ slice: 3, prefix: "x" }] }, folder("p3", present)).length).toBeGreaterThan(0);
    expect(only(small, join(dir, "nowhere"))).toHaveLength(2);
  });
});

describe("slices.json", () => {
  it("names a free prefix for each of slices 3 to 12, and its own list is whole", () => {
    expect(presenceProblems(folder("real", Object.fromEntries(list.slices.map((s) => [`${s.prefix}-x.test.ts`, 'it("a", () => {});']))), list)).toEqual([]);
    expect([...new Set(list.slices.map((s) => s.slice))].sort((a, b) => a - b)).toEqual([...REQUIRED_SLICES]);
  });
});
