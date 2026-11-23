// `ortho add`: plans with blanks that compile, never overwrites; `check` then names every blank with its line.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Add } from "./service.ts";
import { AddRefused } from "./types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const main = resolve(import.meta.dirname, "../../main.ts");
const fresh = join(repo, "examples/acme/test/tmp/add");
const ortho = (...args: ReadonlyArray<string>) => spawnSync("node", [main, ...args, "--root", fresh], { encoding: "utf8" });

afterAll(() => rmSync(fresh, { recursive: true, force: true }));

describe("Add.plan", () => {
  it("a thing is six files in its folder and a values file", () => {
    const planned = Add.plan("thing", "allowance", () => false);
    expect(planned instanceof AddRefused ? planned.message : planned.map((f) => f.path)).toEqual([
      "blueprint/things/allowance/thing.ts", "blueprint/things/allowance/machine.ts", "blueprint/things/allowance/roles.ts",
      "blueprint/things/allowance/events.ts", "blueprint/things/allowance/errors.ts", "blueprint/things/allowance/invariants.ts", "blueprint/values/allowance.ts",
    ]);
  });

  it("an operation, a read and a journey are one file each, where the compiler and prove look", () => {
    const paths = (p: ReturnType<typeof Add.plan>) => (p instanceof AddRefused ? p.message : p.map((f) => f.path));
    expect(paths(Add.plan("operation", "allowance.spend", () => false))).toEqual(["blueprint/things/allowance/verbs/spend.ts"]);
    expect(paths(Add.plan("read", "allowance.get", () => false))).toEqual(["blueprint/things/allowance/verbs/get.ts"]);
    expect(paths(Add.plan("journey", "Spend within an allowance", () => false))).toEqual(["blueprint/journeys/spend-within-an-allowance.ts"]);
  });

  it("refuses a name that doesn't fit, and writes nothing if any file is already there", () => {
    expect(Add.plan("thing", "Allowance", () => false)).toBeInstanceOf(AddRefused);
    expect(Add.plan("operation", "spend", () => false)).toBeInstanceOf(AddRefused);
    const there = Add.plan("thing", "allowance", (p) => p.endsWith("roles.ts"));
    expect(there instanceof AddRefused && there.message).toBe("already there, so nothing was written: blueprint/things/allowance/roles.ts");
  });
});

describe("ortho add, then check, in a fresh project", () => {
  it("writes a thing with 3 blanks that compiles, and check names each with its file and line", { timeout: 120_000 }, () => {
    rmSync(fresh, { recursive: true, force: true });
    mkdirSync(fresh, { recursive: true });
    cpSync(join(repo, "examples/acme/package.json"), join(fresh, "package.json"));
    writeFileSync(join(fresh, "tsconfig.json"), JSON.stringify({ extends: "../../../tsconfig.json", include: ["blueprint/**/*.ts"] }));

    const dry = ortho("add", "thing", "allowance", "--dry-run");
    expect(dry.stdout).toContain("(dry run: 7 files, nothing written)");
    expect(existsSync(join(fresh, "blueprint"))).toBe(false);

    expect(ortho("add", "thing", "allowance").stdout.trim().split("\n")).toHaveLength(7);
    expect(ortho("add", "thing", "allowance").status).toBe(2); // never overwrites

    const tsc = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", fresh, "--noEmit", "--pretty", "false"], { cwd: fresh, encoding: "utf8" });
    expect(tsc.stdout).toBe("");

    const check = ortho("check");
    expect(check.status).toBe(1);
    const lines = check.stdout.trim().split("\n");
    expect(lines[0]).toBe("allowance has 3 blanks");
    const thing = readFileSync(join(fresh, "blueprint/things/allowance/thing.ts"), "utf8").split("\n");
    const at = thing.findIndex((l) => l.includes("Blueprint.todo")) + 1;
    expect(lines).toContain(`  blueprint/things/allowance/thing.ts:${at}  what an allowance is, in one sentence`);

    const model = ortho("model");
    expect(model.status).toBe(0);
    expect(model.stdout).toContain("unfinished allowance  3 blanks");
  });
});
