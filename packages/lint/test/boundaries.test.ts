// The package rules hold: each planted fixture breaks one, and lint names the rule.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");
const rule = "enforce-module-boundaries";

// The workspace config, with fixtures no longer ignored: one source of rules.
const fixturesConfig = (): string => {
  const config = JSON.parse(readFileSync(join(root, ".oxlintrc.json"), "utf8"));
  config.ignorePatterns = config.ignorePatterns.filter((p: string) => !p.includes("fixtures"));
  // The copy lives in tmp/, so a plugin given by a relative path is given from the root instead.
  config.jsPlugins = config.jsPlugins.map((p: string) => (p.startsWith(".") ? join(root, p) : p));
  mkdirSync(join(root, "tmp"), { recursive: true });
  const path = join(root, "tmp", "oxlintrc.fixtures.json");
  writeFileSync(path, JSON.stringify(config));
  return path;
};

// The workspace's oxlint binary, run directly: `pnpm exec` added a second Node start to every case.
const oxlint = join(root, "node_modules", ".bin", "oxlint");

interface Run { readonly exit: number | null; readonly stdout: string; readonly output: string }
/** One oxlint run on its own, as `spawnSync` gave it: its exit, its stdout, and stdout then stderr. */
const run = (args: ReadonlyArray<string>) =>
  new Promise<Run>((resolve, reject) => {
    const child = spawn(oxlint, [...args], { cwd: root });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", reject);
    child.on("close", (exit) => resolve({ exit, stdout, output: stdout + stderr }));
  });

// Pro's scope in pieces, and the fixture written here: check 15 allows the name only in portal-ui and the design.
const pro = "@heroui" + "-pro/react";
const proFile = "tmp/lint-pro/imports-pro.ts";
const files = [
  "packages/orthograph/test/fixtures/boundaries/imports-compiler.ts",
  "packages/orthograph/test/fixtures/boundaries/imports-other-package.ts",
  "packages/language-effect/test/fixtures/boundaries/imports-generators.ts",
  "packages/lint/test/fixtures/boundaries/imports-viem.ts",
  "packages/chain-evm/src/main.ts",
  "packages/orthograph/test/fixtures/boundaries/imports-effect.ts",
];

// Each case is one oxlint start, which loads the JS plugin: 1 to 6 s apiece on a CI runner, one after another 16 s, and
// under load one took 5967 ms against vitest's 5 s default (design/decisions/CI-docs-fast-path.md). So every run starts
// here at once, each still on its own file with its own exit, and each case reads its own
// (design/decisions/CI-sibling-test-speed.md).
const runs = new Map<string, Promise<Run>>();
const lint = (file: string): Promise<Run> => runs.get(file)!;

beforeAll(() => {
  const config = fixturesConfig();
  for (const file of files) runs.set(file, run(["-c", config, file]));
  mkdirSync(join(root, "tmp/lint-pro"), { recursive: true });
  writeFileSync(join(root, proFile), `import { Button } from "${pro}";\nexport { Chart } from "${pro}/chart";\nexport type Sheet = import("${pro}").Sheet;\nexport const planted = Button;\n`);
  runs.set(proFile, run(["-c", config, "--no-ignore", "--format", "github", proFile]));
});
afterAll(async () => {
  await Promise.allSettled(runs.values());
  rmSync(join(root, "tmp/lint-pro"), { recursive: true, force: true });
});

// The timeouts are the ones each case had when it ran its own oxlint: a case now waits for its run, started with all the others.
describe("module boundaries", { timeout: 30_000 }, () => {
  it.each([
    ["blueprint imports compiler", "packages/orthograph/test/fixtures/boundaries/imports-compiler.ts"],
    ["blueprint imports a package other than Effect", "packages/orthograph/test/fixtures/boundaries/imports-other-package.ts"],
    ["runtime code imports generators", "packages/language-effect/test/fixtures/boundaries/imports-generators.ts"],
  ])("fails lint when %s", async (_, file) => {
    const { exit, output } = await lint(file);
    expect(exit).toBe(1);
    expect(output).toContain(rule);
  });

  it("refuses static, dynamic and type viem imports outside chain-evm", { timeout: 60_000 }, async () => {
    const { exit, output } = await lint("packages/lint/test/fixtures/boundaries/imports-viem.ts");
    expect(exit).toBe(1);
    expect(output.match(/Import EVM functionality from @orthograph\/chain-evm instead of viem/g)).toHaveLength(4);
    expect((await lint("packages/chain-evm/src/main.ts")).exit).toBe(0);
  });

  it("refuses HeroUI Pro outside portal-ui, naming @orthograph/portal-ui in the GitHub reporter too (F7)", { timeout: 60_000 }, async () => {
    const run = await lint(proFile);
    expect(run.exit).toBe(1);
    const lines = run.stdout.split("\n").filter((l) => l.includes("ortho(no-pro-outside-portal-ui)"));
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line).toContain("import the component from @orthograph/portal-ui");
  });

  it("passes when blueprint imports Effect", async () => {
    expect((await lint("packages/orthograph/test/fixtures/boundaries/imports-effect.ts")).exit).toBe(0);
  });
});
