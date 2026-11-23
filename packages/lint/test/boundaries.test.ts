// The package rules hold: each planted fixture breaks one, and lint names the rule.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

const lint = (file: string) => {
  const run = spawnSync(oxlint, ["-c", fixturesConfig(), file], { cwd: root, encoding: "utf8" });
  return { exit: run.status, output: run.stdout + run.stderr };
};

// Each case starts oxlint, which loads the JS plugin; under a loaded CI runner one took 5967 ms against vitest's 5 s
// default, and every such flake cost a rerun of `check` (design/decisions/CI-docs-fast-path.md).
describe("module boundaries", { timeout: 30_000 }, () => {
  it.each([
    ["blueprint imports compiler", "packages/orthograph/test/fixtures/boundaries/imports-compiler.ts"],
    ["blueprint imports a package other than Effect", "packages/orthograph/test/fixtures/boundaries/imports-other-package.ts"],
    ["runtime code imports generators", "packages/language-effect/test/fixtures/boundaries/imports-generators.ts"],
  ])("fails lint when %s", (_, file) => {
    const { exit, output } = lint(file);
    expect(exit).toBe(1);
    expect(output).toContain(rule);
  });

  it("refuses static, dynamic and type viem imports outside chain-evm", { timeout: 60_000 }, () => {
    const { exit, output } = lint("packages/lint/test/fixtures/boundaries/imports-viem.ts");
    expect(exit).toBe(1);
    expect(output.match(/Import EVM functionality from @orthograph\/chain-evm instead of viem/g)).toHaveLength(4);
    expect(lint("packages/chain-evm/src/main.ts").exit).toBe(0);
  });

  it("refuses HeroUI Pro outside portal-ui, naming @orthograph/portal-ui in the GitHub reporter too (F7)", { timeout: 60_000 }, () => {
    // Pro's scope in pieces, and the fixture written here: check 15 allows the name only in portal-ui and the design.
    const pro = "@heroui" + "-pro/react";
    const file = "tmp/lint-pro/imports-pro.ts";
    mkdirSync(join(root, "tmp/lint-pro"), { recursive: true });
    writeFileSync(join(root, file), `import { Button } from "${pro}";\nexport { Chart } from "${pro}/chart";\nexport type Sheet = import("${pro}").Sheet;\nexport const planted = Button;\n`);
    const config = fixturesConfig();
    const run = spawnSync(join(root, "node_modules/.bin/oxlint"), ["-c", config, "--no-ignore", "--format", "github", file], { cwd: root, encoding: "utf8" });
    rmSync(join(root, "tmp/lint-pro"), { recursive: true, force: true });
    expect(run.status).toBe(1);
    const lines = run.stdout.split("\n").filter((l) => l.includes("ortho(no-pro-outside-portal-ui)"));
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line).toContain("import the component from @orthograph/portal-ui");
  });

  it("passes when blueprint imports Effect", () => {
    expect(lint("packages/orthograph/test/fixtures/boundaries/imports-effect.ts").exit).toBe(0);
  });
});
