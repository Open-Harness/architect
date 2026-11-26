// What `create-orthograph` does with its arguments, in-process: the entry only prints and exits.
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Create } from "./service.ts";

const dirs: Array<string> = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const parent = () => { const d = mkdtempSync(join(tmpdir(), "create-orthograph-")); dirs.push(d); return d; };

describe("create-orthograph", () => {
  it("makes the app named and says what to do next", () => {
    const d = parent();
    const lines = Effect.runSync(Create.run({ args: ["bakery"], parent: d }));
    expect(lines.join("\n")).toContain("pnpm ortho check");
    expect(existsSync(join(d, "bakery/blueprint"))).toBe(true);
  });

  it("refuses no name, an extra word and a bad name, writing nothing", () => {
    const d = parent();
    for (const args of [[], ["bakery", "surplus"], ["Bakery"]]) expect(Effect.runSync(Create.run({ args, parent: d }).pipe(Effect.flip))._tag).toBe("AppRefused");
    expect(readdirSync(d)).toEqual([]);
  });

  it("--help says how to use it and makes nothing", () => {
    const d = parent();
    expect(Effect.runSync(Create.run({ args: ["--help"], parent: d })).join("\n")).toContain("npm create orthograph");
    expect(readdirSync(d)).toEqual([]);
  });
});
