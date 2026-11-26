// Determinism (CX-from-doctype): two runs on the same project and the same files write the same bytes, a dry run
// prints exactly what a run writes and writes nothing, and a run over a thing already there is refused, changing
// nothing.
import { afterAll, describe, expect, it } from "vitest";
import { cleanup, doctype, nested, once, project, refused, scaffolds, snapshot, textAt, written } from "./support.ts";

afterAll(cleanup);

const steps: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  [doctype("tea_blend"), ["--asset", "usdc"]],
  [nested("tea_menu"), ["--asset", "usdc"]],
  [doctype("tea_invoice"), ["--asset", "usdc"]],
  [doctype("tea_order"), []],
  [doctype("tea_supplier"), []],
];
const run = () => {
  const root = project();
  const wrote: Array<ReadonlyArray<string>> = [];
  for (const [file, flags] of steps) {
    const before = snapshot(root);
    scaffolds(root, file, ...flags);
    wrote.push(written(before, root));
  }
  return { root, wrote, after: snapshot(root) };
};
const first = once(run);
const second = once(run);

/** `--dry-run`'s listing: each `--- <path>` and the content under it, up to the next. */
const listed = (out: string): Record<string, string> => {
  const files: Record<string, string> = {};
  const parts = out.split(/^--- (\S+)\n/m);
  for (let i = 1; i + 1 < parts.length; i += 2) files[parts[i] ?? ""] = (parts[i + 1] ?? "").replace(/\(dry run: \d+ files?, nothing written\)\n$/, "");
  return files;
};

describe("CX-from-doctype 07: determinism", () => {
  it("writes the same bytes in two projects from the same files, run in the same order", () => {
    const [a, b] = [first(), second()];
    expect(a.wrote.every((w) => w.length > 0), "every step wrote files").toBe(true);
    expect(b.after).toEqual(a.after);
    expect(b.wrote).toEqual(a.wrote);
  });

  it("prints with --dry-run exactly the files a run writes, byte for byte, and writes nothing", () => {
    const { root: done, wrote } = first();
    const root = project();
    const before = snapshot(root);
    const ran = scaffolds(root, doctype("tea_blend"), "--asset", "usdc", "--dry-run");
    expect(snapshot(root), "a dry run writes nothing").toEqual(before);
    const shown = listed(ran.out);
    expect(Object.keys(shown).sort()).toEqual([...(wrote[0] ?? [])]);
    for (const path of wrote[0] ?? []) expect(shown[path], path).toBe(textAt(done, path));
  });

  it("refuses a second run over a thing already there, naming it, and changes nothing", () => {
    const { root, after } = first();
    refused(root, ["tea-blend"], doctype("tea_blend"), "--asset", "usdc");
    refused(root, ["tea-menu"], nested("tea_menu"), "--asset", "usdc");
    expect(snapshot(root)).toEqual(after);
  });
});
