// `ortho --version` prints the CLI package's own version (Ask #542), read from its package.json, not a number written in main.ts.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { readonly version: string };

/** Without colour: CI sets FORCE_COLOR, which wraps the words in ANSI codes; a script reading the version gets plain text. */
const plain = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" };

describe("ortho --version", () => {
  it("prints the version in the CLI's package.json", { timeout: 60_000 }, () => {
    const ran = spawnSync("node", [resolve(root, "src/main.ts"), "--version"], { encoding: "utf8", cwd: root, env: plain });
    expect(ran.status, ran.stderr).toBe(0);
    expect(ran.stdout.trim()).toMatch(new RegExp(`^ortho v?${version.replaceAll(".", "\\.")}$`));
  });
});
