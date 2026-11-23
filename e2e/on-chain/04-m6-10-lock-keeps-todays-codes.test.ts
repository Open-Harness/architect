// Goal 4, slice 3 (M6.10), eleventh check: the first lock keeps today's codes (`design/decisions/M6-chain.md` item 4: "The first generate after this lands numbers every existing
// refusal exactly as `describe.ts` does now, so acme's and Plugged In's codes and generated files do not change"). Written by the checks author; a builder never edits this
// file (AGENTS.md, "Journeys and checks come first"). Check `02-seam-byte-identical.test.ts` already compares each example's `generated/` byte for byte; this one adds the lock.
//
// WHAT IS REQUIRED. For each of `examples/acme` and `examples/plugged-in`, in a copy outside the repository whose `blueprint/refusals.lock` is removed (the first lock) and whose
// `generated/` is removed, the real `ortho generate`:
//   - writes `blueprint/refusals.lock`, which `lockProblems` finds right, holding exactly the refusals the example's checked-in `generated/model/model.json` has today: the same
//     names and the same codes, no more and none fewer, each entry under the code of its name; `retired` is empty, and every `earlier` is empty;
//   - every refusal of the lock is named in the checked-in model: a declared one by a `from` that is an `errors.ts` of the example, a generated one (the machine's, the not-found) by
//     none, the runtime's by owner `runtime`;
//   - writes `generated/` byte for byte as checked in (no file more, none fewer, none different);
//   - and generating a second time, with the lock now there, leaves the lock and `generated/` as the first left them.
//
// THE CONTROLS: `codesOf` is planted below (a code moved by one, a name added, a name left out, a duplicate), and `treeProblems` is planted by check 02.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lockProblems } from "./chain-readers.ts";
import { acme, ortho } from "./chain-fixture.ts";
import { copyOf, repo } from "../layer1/support.ts";
import { treeProblems } from "./seam.ts";

type Lock = { refusals: Record<string, { name: string; owner: string; from?: string; earlier: unknown[] }>; retired: Record<string, unknown> };
/** What is wrong with a lock next to the checked-in refusals map (name to code): one line per difference. */
const codesOf = (lock: Lock, today: Readonly<Record<string, string>>): ReadonlyArray<string> => {
  const inLock = Object.entries(lock.refusals).map(([code, e]) => [e.name, code] as const);
  return [
    ...inLock.filter(([n, c]) => today[n] !== c).map(([n, c]) => `${n}: the lock says ${c}, the checked-in model ${String(today[n])}`),
    ...Object.keys(today).filter((n) => !inLock.some(([m]) => m === n)).map((n) => `${n} (${today[n]}) is in the checked-in model but not in the lock`),
    ...inLock.filter(([n], i) => inLock.findIndex(([m]) => m === n) !== i).map(([n]) => `${n} is in the lock twice`),
  ];
};

describe("controls: codesOf refuses a lock that is not today's", () => {
  const today = { A: "XX-001", B: "XX-002" };
  const lock = (codes: Record<string, string>): Lock => ({ refusals: Object.fromEntries(Object.entries(codes).map(([code, name]) => [code, { name, owner: "x", earlier: [] }])), retired: {} });
  it("accepts the same codes", () => expect(codesOf(lock({ "XX-001": "A", "XX-002": "B" }), today)).toEqual([]));
  it("refuses a code moved by one, a name added, a name left out, and a name twice", () => {
    expect(codesOf(lock({ "XX-001": "B", "XX-002": "A" }), today)).toHaveLength(2);
    expect(codesOf(lock({ "XX-001": "A", "XX-002": "B", "XX-003": "C" }), today)).toHaveLength(1);
    expect(codesOf(lock({ "XX-001": "A" }), today)).toHaveLength(1);
    expect(codesOf(lock({ "XX-001": "A", "XX-002": "B", "XX-003": "B" }), today).join("\n")).toContain("twice");
  });
});

const read = (root: string) => JSON.parse(readFileSync(join(root, "blueprint/refusals.lock"), "utf8")) as Lock;

for (const [name, example] of [["examples/acme", acme], ["examples/plugged-in", join(repo, "examples/plugged-in")]] as const) {
  describe(`${name}: the first lock keeps today's codes and today's generated files`, () => {
    it("generate writes a lock of exactly the checked-in refusals, and generated/ byte for byte; a second generate changes neither", { timeout: 600_000 }, () => {
      const today = (JSON.parse(readFileSync(join(example, "generated/model/model.json"), "utf8")) as { refusals: Record<string, string> }).refusals;
      const copy = copyOf(example);
      try {
        rmSync(join(copy.root, "generated"), { recursive: true, force: true });
        rmSync(join(copy.root, "blueprint/refusals.lock"), { force: true });
        const first = ortho(copy.root, "generate");
        expect(first.status, (first.stdout + first.stderr).slice(-1500)).toBe(0);
        expect(existsSync(join(copy.root, "blueprint/refusals.lock")), "ortho generate wrote no blueprint/refusals.lock").toBe(true);
        const text = readFileSync(join(copy.root, "blueprint/refusals.lock"), "utf8");
        const model = JSON.parse(readFileSync(join(example, "generated/model/model.json"), "utf8")) as { things: Record<string, { code: string }> };
        const opts = { prefixes: Object.fromEntries(Object.entries(model.things).map(([n, t]) => [n, t.code])), solidity: false };
        expect(lockProblems(text, opts), lockProblems(text, opts).join("\n")).toEqual([]);
        const lock = read(copy.root);
        expect(codesOf(lock, today), codesOf(lock, today).join("\n")).toEqual([]);
        expect(lock.retired).toEqual({});
        for (const [code, e] of Object.entries(lock.refusals)) {
          expect(e.earlier, code).toEqual([]);
          if (code.startsWith("AR-")) expect(e.owner, code).toBe("runtime");
          else if (e.from !== undefined) expect(e.from, code).toMatch(/errors\.ts$/);
        }
        expect(treeProblems(join(example, "generated"), join(copy.root, "generated"))).toEqual([]);
        const second = ortho(copy.root, "generate");
        expect(second.status, (second.stdout + second.stderr).slice(-1500)).toBe(0);
        expect(readFileSync(join(copy.root, "blueprint/refusals.lock"), "utf8")).toBe(text);
        expect(treeProblems(join(example, "generated"), join(copy.root, "generated"))).toEqual([]);
      } finally { copy.remove(); }
    });
  });
}
