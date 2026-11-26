// Determinism (CX-from-doctype): two runs on the same project and the same files write the same bytes, the second
// with every clock 400 days on, a dry run
// prints exactly what a run writes and writes nothing, and a run over a thing already there is refused, changing
// nothing.
import { afterAll, describe, expect, it } from "vitest";
import { cleanup, doctype, nested, once, project, refused, scaffoldLater, scaffolds, snapshot, textAt, written } from "./support.ts";

afterAll(cleanup);

const steps: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  [doctype("tea_blend"), ["--asset", "usdc"]],
  [nested("tea_menu"), ["--asset", "usdc"]],
  [doctype("tea_invoice"), ["--asset", "usdc"]],
  [doctype("tea_order"), []],
  [doctype("tea_supplier"), []],
];
const run = (later: boolean) => {
  const root = project();
  const wrote: Array<ReadonlyArray<string>> = [];
  for (const [file, flags] of steps) {
    const before = snapshot(root);
    (later ? scaffoldLater : scaffolds)(root, file, ...flags);
    wrote.push(written(before, root));
  }
  return { root, wrote, after: snapshot(root) };
};
const first = once(() => run(false));
const second = once(() => run(true));

/** `--dry-run`'s listing: each `--- <path>` and the content under it, up to the next. */
const listed = (out: string): Record<string, string> => {
  const files: Record<string, string> = {};
  const parts = out.split(/^--- (\S+)\n/m);
  for (let i = 1; i + 1 < parts.length; i += 2) files[parts[i] ?? ""] = (parts[i + 1] ?? "").replace(/\(dry run: \d+ files?, nothing written\)\n$/, "");
  return files;
};

describe("CX-from-doctype 07: determinism", () => {
  it("writes the same bytes in two projects from the same files, run in the same order, the second 400 days later", () => {
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

  it("prints with --dry-run the link values a run writes, and the lines, for a doctype with two tables", () => {
    const real = project();
    const before = snapshot(real);
    scaffolds(real, doctype("infusion"));
    const wrote = written(before, real);
    expect(wrote, "the two lines and the link value are among them").toEqual(expect.arrayContaining(["blueprint/things/infusion-step/thing.ts", "blueprint/things/infusion-tag/thing.ts", "blueprint/values/tea-kettle-link.ts"]));
    const dry = project();
    const quiet = snapshot(dry);
    const shown = listed(scaffolds(dry, doctype("infusion"), "--dry-run").out);
    expect(snapshot(dry)).toEqual(quiet);
    expect(Object.keys(shown).sort()).toEqual([...wrote]);
    for (const path of wrote) expect(shown[path], path).toBe(textAt(real, path));
  });

  it("refuses a second run over a thing already there, naming it, and changes nothing", () => {
    const { root, after } = first();
    refused(root, ["tea-blend"], doctype("tea_blend"), "--asset", "usdc");
    refused(root, ["tea-menu"], nested("tea_menu"), "--asset", "usdc");
    expect(snapshot(root)).toEqual(after);
  });
});
