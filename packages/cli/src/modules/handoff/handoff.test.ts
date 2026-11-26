import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Handoff } from "./service.ts";

const roots: Array<string> = [];
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });
const scratch = () => { const r = mkdtempSync(join(tmpdir(), "ortho-handoff-")); roots.push(r); return r; };

/** A package folder with a package.json and its bin file. */
const cli = (dir: string, name = "@orthograph/cli", bin = "dist/main.js") => {
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, bin: { ortho: bin } }));
  writeFileSync(join(dir, "dist/main.js"), "");
  return dir;
};

describe("a global ortho hands off to the app's own CLI", () => {
  it("answers the app's installed CLI's ortho entry, found from a folder inside the app", () => {
    const root = scratch();
    const app = join(root, "app");
    const local = cli(join(app, "node_modules/@orthograph/cli"));
    const own = cli(join(root, "global/lib/node_modules/@orthograph/cli"));
    mkdirSync(join(app, "blueprint/things"), { recursive: true });
    expect(Handoff.target({ from: join(app, "blueprint/things"), own })).toBe(join(local, "dist/main.js"));
  });

  it("answers nothing outside an app with the CLI installed", () => {
    const root = scratch();
    const own = cli(join(root, "global/lib/node_modules/@orthograph/cli"));
    mkdirSync(join(root, "empty"));
    expect(Handoff.target({ from: join(root, "empty"), own })).toBeUndefined();
  });

  it("answers nothing when the app's CLI is this one, through a link", () => {
    const root = scratch();
    const own = cli(join(root, "packages/cli"));
    mkdirSync(join(root, "app/node_modules/@orthograph"), { recursive: true });
    symlinkSync(own, join(root, "app/node_modules/@orthograph/cli"));
    expect(Handoff.target({ from: join(root, "app"), own })).toBeUndefined();
  });

  it("answers nothing for a package that is not the CLI, or whose bin is missing", () => {
    const root = scratch();
    const own = cli(join(root, "global/cli"));
    cli(join(root, "a/node_modules/@orthograph/cli"), "something-else");
    cli(join(root, "b/node_modules/@orthograph/cli"), "@orthograph/cli", "dist/gone.js");
    expect(Handoff.target({ from: join(root, "a"), own })).toBeUndefined();
    expect(Handoff.target({ from: join(root, "b"), own })).toBeUndefined();
  });

  it("reads --root as the parser does, else the working directory", () => {
    expect(Handoff.from(["check"], "/w")).toBe("/w");
    expect(Handoff.from(["check", "--root", "app"], "/w")).toBe("/w/app");
    expect(Handoff.from(["check", "--root=/elsewhere"], "/w")).toBe("/elsewhere");
  });
});
