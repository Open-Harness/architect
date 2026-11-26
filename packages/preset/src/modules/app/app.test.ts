// The app made as a folder: the names it takes, the folders it refuses, and that a refusal writes nothing.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./service.ts";

const dirs: Array<string> = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const parent = () => { const d = mkdtempSync(join(tmpdir(), "ortho-app-")); dirs.push(d); return d; };
const refusal = (input: { parent: string; name: string }) => Effect.runSync(App.create(input).pipe(Effect.flip)).message;

describe("app names", () => {
  it("are lower case words joined by dashes", () => {
    for (const ok of ["bakery", "pastry-shop", "a1", "shop-2"]) expect(App.isName(ok), ok).toBe(true);
    for (const bad of ["Bakery", "my bakery", "../escape", "a/b", "bakery-", "-bakery", "1bakery", "", "a--b"]) expect(App.isName(bad), bad).toBe(false);
  });

  it("refuses a reserved name, which would make a package depend on itself", () => {
    const d = parent();
    for (const name of ["orthograph", "effect"]) expect(refusal({ parent: d, name })).toMatch(/reserved/);
    expect(readdirSync(d)).toEqual([]);
  });

  it("takes exactly one name from the words after the command", () => {
    expect(Effect.runSync(App.nameIn(["bakery"]))).toBe("bakery");
    expect(Effect.runSync(App.nameIn([]).pipe(Effect.flip)).message).toMatch(/needs a name/);
    expect(Effect.runSync(App.nameIn(["bakery", "surplus"]).pipe(Effect.flip)).message).toContain("surplus");
  });
});

describe("App.create", () => {
  it("makes the app, installs nothing and says what to do next", () => {
    const d = parent();
    const lines = Effect.runSync(App.create({ parent: d, name: "bakery" }));
    expect(lines.join("\n")).toContain("cd bakery");
    expect(readdirSync(d)).toEqual(["bakery"]);
    expect(existsSync(join(d, "bakery/node_modules"))).toBe(false);
    expect(readFileSync(join(d, "bakery/generated/cli/src/main.ts"), "utf8")).toContain("bakery");
  });

  it("fills an empty folder; refuses one with anything in it, hidden files too, and leaves it as it was", () => {
    const d = parent();
    mkdirSync(join(d, "empty"));
    Effect.runSync(App.create({ parent: d, name: "empty" }));
    expect(existsSync(join(d, "empty/package.json"))).toBe(true);
    mkdirSync(join(d, "full"));
    writeFileSync(join(d, "full/.env"), "k=v\n");
    expect(refusal({ parent: d, name: "full" })).toMatch(/full\/ is not empty/);
    expect(readdirSync(join(d, "full"))).toEqual([".env"]);
  });

  it("refuses a file in the folder's place, untouched", () => {
    const d = parent();
    writeFileSync(join(d, "bakery"), "a file\n");
    expect(refusal({ parent: d, name: "bakery" })).toMatch(/bakery already exists/);
    expect(readFileSync(join(d, "bakery"), "utf8")).toBe("a file\n");
  });

  it("refuses a bad name before writing anything, even the parent folder", () => {
    const d = join(parent(), "not-yet");
    expect(refusal({ parent: d, name: "Bad Name" })).toMatch(/lower case/);
    expect(existsSync(d)).toBe(false);
  });
});
