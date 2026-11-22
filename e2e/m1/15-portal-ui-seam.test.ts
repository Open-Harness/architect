// Check 15 (M1.34): one package behind the portal's components (F7, K24; today HeroUI Pro). `@orthograph/portal-ui`, at `packages/portal-ui`, is the only importer
// of `@heroui-pro/react`, which it takes as a peer dependency and never bundles; a lint rule bans Pro everywhere else; CI
// installs Pro from the `HEROUI_AUTH_TOKEN` secret, cached by lockfile, and never on a fork's pull request.
//
// Pro is a private-registry package and this check has no token and asks for none. What it judges without Pro: the manifest,
// the packed file list, the repository tree, the lint (by the real `.oxlintrc.json`), and the workflows (parsed, and each `if`
// above the token evaluated for a fork's pull request). What needs Pro, and so runs where Pro is installed: building `portal-ui`
// and scanning its packed `dist`. That half runs in CI, which the check knows by `CI=true` (GitHub sets it) and never by
// reading the token; with Pro installed anywhere else it runs too, and without Pro and outside CI it does not build.
//
// Assumptions beyond F7 and M1.34, where the design is silent:
//  1. The lint rule is `no-restricted-imports` as an error, and its message names `@orthograph/portal-ui` (what to import
//     instead). A planted `import "@heroui-pro/react"`, a subpath import and an `export … from` each fail in a copy of
//     `packages/portal`, and in an example's `generated/`; the same import passes in `packages/portal-ui` and under `spikes/`.
//     `.oxlintrc.json` ignores `**/generated/**` today, and F7 decision 3 bans Pro in all generated code, so the rule must
//     hold there: how is the builder's (an override, a second config, or lint of `generated/` for this one rule). The check
//     lints a mirror of the repository's layout with the repository's own `.oxlintrc.json`, not a mocked config.
//  2. The package has `package.json` (name `@orthograph/portal-ui`, not private, `publishConfig.access` public), `src/index.ts`
//     or `.tsx`, `README.md` and its own `LICENSE`. `@heroui-pro/react` is in `peerDependencies`, at most also in
//     `devDependencies` (exact), and in neither `dependencies` nor `optionalDependencies`.
//  3. `files` lists `dist`; the published exports (`publishConfig.exports`, else `exports`) point into `./dist/`. The names
//     of F7's table (`Shell`, `Board`, `Grid`, `Chart`, `Stat`, `StatGroup`, `Card`, `CardGroup`, `Peek`, `Widget`, `Timeline`,
//     `Command`, `Code`, `Markdown`, `Editor`, `Chat`) are exported from the source, judged by reading it (importing needs Pro).
//  4. The packed tarball (`npm pack --dry-run --json`) holds `package.json`, `README.md`, a licence, and `dist/**`, and nothing
//     else: no `src`, no `node_modules`, no dotfile. The README says Pro is a peer dependency and needs the installer's own
//     licence (F7 decision 1). Without a build the dist half of the listing is empty; the CI half lists it.
//  5. "Nothing of Pro in dist" is `proInside` (a path, a banner or a mention that is not an import specifier) and, when Pro is
//     installed, `copiedFrom` (a line of 100+ characters of Pro's own JavaScript present verbatim). An external
//     `from "@heroui-pro/react"` is the seam working, and is allowed.
//  6. Committed: `@heroui-pro` appears, outside `spikes/`, docs (`design/`, `docs/`, `*.md`), the lockfile, workspace
//     config, the lint config and workflows, only in `packages/portal-ui`'s own files; no tracked file is under a path named
//     for Pro or in a `node_modules`; no tracked file gives `HEROUI_AUTH_TOKEN` a literal value.
//  7. CI: some job reads `secrets.HEROUI_AUTH_TOKEN`; it is never read at workflow level, never inside a `run` script, and every
//     reference sits under an `if` that is false for a fork's `pull_request` and `pull_request_target` and true for a push and
//     for a same-repository pull request; that job builds `portal-ui`; and an `actions/cache` step before its `pnpm install`
//     is keyed on `hashFiles` of `pnpm-lock.yaml` and covers `node_modules`, the pnpm store or Pro's folder.
//
// The tripwire fails and never skips: today it names the package, its files, the rule and the job that are missing. The controls
// pass today and keep passing: the lint mirror reports a plain finding, the dist scanner and the workflow reader are proved on cases.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repo } from "./support.ts";
import { bans, contexts, copiedFrom, evaluate, lintMirror, proInside, read, runsOn, textFiles, unsafe } from "./portal-seam.ts";

const dir = join(repo, "packages/portal-ui");
/** A file of portal-ui, or a failure that names it (the red is the missing file, not an ENOENT). */
const needed = (file: string) => {
  if (!existsSync(join(dir, file))) throw new Error(`packages/portal-ui/${file} does not exist yet (M1.34)`);
  return readFileSync(join(dir, file), "utf8");
};
const manifest = () => JSON.parse(needed("package.json")) as Record<string, any>;
const tracked = () => spawnSync("git", ["ls-files", "-z"], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\0").filter((f) => f !== "" && existsSync(join(repo, f)) && lstatSync(join(repo, f)).isFile());
const workflows = () => Object.entries(textFiles(join(repo, ".github/workflows"), (p) => /\.ya?ml$/.test(p)));
const inCi = process.env.CI === "true";
const proDir = join(dir, "node_modules/@heroui-pro/react");
const proInstalled = existsSync(join(proDir, "package.json"));
const importLine = `import { Button } from "@heroui-pro/react"; export const planted = Button;\n`;
const pack = () => {
  if (!existsSync(dir)) return { status: null, list: [] as Array<string>, err: "packages/portal-ui does not exist yet (M1.34)" };
  const run = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8" });
  const list = run.status === 0 ? (JSON.parse(run.stdout) as Array<{ files: Array<{ path: string }> }>)[0]?.files.map((f) => f.path) ?? [] : [];
  return { status: run.status, list, err: run.stderr };
};
const sources = () => textFiles(join(dir, "src"), (p) => /\.tsx?$/.test(p));

describe("15 the surface: what the seam needs", () => {
  it("has portal-ui, its README and licence, the lint rule's message, and a CI job that reads the secret", () => {
    const missing: Array<string> = [];
    for (const file of ["package.json", "README.md", "LICENSE"]) if (!existsSync(join(dir, file))) missing.push(`packages/portal-ui/${file}`);
    if (Object.keys(sources()).length === 0) missing.push("packages/portal-ui/src (index.ts or index.tsx)");
    if (!readFileSync(join(repo, ".oxlintrc.json"), "utf8").includes(`${"@heroui-pro"}/`)) missing.push(".oxlintrc.json: no-restricted-imports for @heroui-pro/*");
    if (!workflows().some(([, text]) => /secrets\.HEROUI_AUTH_TOKEN/i.test(text))) missing.push(".github/workflows: a job that installs Pro from secrets.HEROUI_AUTH_TOKEN");
    expect(missing, `the seam is not there until: ${missing.join("; ")}. This is a tripwire: it fails, it never skips.`).toEqual([]);
  });
});

describe("15 the package: Pro is a peer, our names are exported", () => {
  it("takes @heroui-pro/react as a peer dependency only, is public, and publishes dist", () => {
    const pkg = manifest();
    expect(pkg.name).toBe("@orthograph/portal-ui");
    expect(pkg.private, "published like the other packages").not.toBe(true);
    expect(pkg.publishConfig?.access).toBe("public");
    expect(Object.keys(pkg.peerDependencies ?? {})).toContain("@heroui-pro/react");
    expect(typeof pkg.peerDependencies["@heroui-pro/react"]).toBe("string");
    for (const field of ["dependencies", "optionalDependencies", "bundleDependencies"]) {
      expect(Object.keys(pkg[field] ?? {}).filter((n) => n.startsWith("@heroui-pro")), `${field} must not hold Pro`).toEqual([]);
    }
    const dev = pkg.devDependencies?.["@heroui-pro/react"];
    if (dev !== undefined) expect(dev, "pinned exactly (AGENTS.md)").toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
    expect(pkg.files).toContain("dist");
    const exported = JSON.stringify(pkg.publishConfig?.exports ?? pkg.exports);
    const targets = [...exported.matchAll(/"(\.\/[^"]+)"/g)].map((m) => m[1]!).filter((t) => t !== ".");
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target.startsWith("./dist/") || target.startsWith("./package.json"), `${target} points into dist`).toBe(true);
  });

  it("exports Shell, Board, Grid, Chart, Stat, StatGroup, Card, CardGroup, Peek, Widget, Timeline, Command, Code, Markdown, Editor and Chat", () => {
    const text = Object.values(sources()).join("\n");
    const names = ["Shell", "Board", "Grid", "Chart", "Stat", "StatGroup", "Card", "CardGroup", "Peek", "Widget", "Timeline", "Command", "Code", "Markdown", "Editor", "Chat"];
    const missing = names.filter((name) => !new RegExp(`export\\s+(?:const|function|class|namespace)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}|export\\s*\\*\\s*as\\s+${name}\\b`).test(text));
    expect(missing, `portal-ui does not export: ${missing.join(", ")}`).toEqual([]);
  });

  it("its README says Pro is a peer dependency the installer licenses; its LICENSE is its own", () => {
    const readme = needed("README.md");
    expect(readme).toMatch(/HeroUI Pro/);
    expect(readme).toMatch(/peer/i);
    expect(readme).toMatch(/licen[cs]e/i);
    expect(needed("LICENSE").trim().length).toBeGreaterThan(100);
  });
});

describe("15 the publish preview: what the tarball would hold", () => {
  it("lists package.json, README.md, a licence and dist, and nothing else", () => {
    const { status, list, err } = pack();
    expect(status, `npm pack --dry-run failed in packages/portal-ui: ${err.slice(0, 300)}`).toBe(0);
    expect(list).toContain("package.json");
    expect(list).toContain("README.md");
    expect(list.some((p) => /^LICEN[CS]E(?:\.\w+)?$/i.test(p)), `no licence in ${list.join(", ")}`).toBe(true);
    expect(list.filter((p) => !/^(?:package\.json|README\.md|LICEN[CS]E(?:\.\w+)?|CHANGELOG\.md|dist\/.+)$/i.test(p)), "nothing outside dist and the four documents").toEqual([]);
  });

  it("holds nothing of Pro in its packed files; built where Pro is installed (CI, with the secret)", () => {
    // Where this half runs is the check's call, not the token's: CI=true, or Pro is installed here.
    if (!inCi && !proInstalled) {
      const target = JSON.parse(needed("project.json")).targets?.build;
      expect(target, "portal-ui has a build target; its dist half runs in CI only (CI=true), where Pro is installed from the secret").toBeDefined();
      return;
    }
    expect(proInstalled, "in CI, Pro must be installed in portal-ui (the install job); the build needs it").toBe(true);
    const built = spawnSync("pnpm", ["nx", "run", "portal-ui:build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    expect(built.status, built.stdout.slice(-600)).toBe(0);
    const { list } = pack();
    expect(list.some((p) => p.startsWith("dist/") && p.endsWith(".js")), "the build wrote dist/*.js").toBe(true);
    const files = textFiles(dir, (p) => list.includes(p));
    expect(proInside(files)).toEqual([]);
    expect(copiedFrom(proDir, files)).toEqual([]);
  });
});

describe("15 the repository: nothing of Pro is committed, and only portal-ui imports it", () => {
  it("has Pro's name only where it may be, no path named for Pro, no literal token", () => {
    const files = tracked();
    const allowed = /^(?:spikes\/|design\/|\.agents\/skills\/kanban\/data\/|docs\/|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|\.oxlintrc\.json$|\.npmrc$|\.github\/workflows\/|e2e\/m1\/(?:15-|portal-seam)|packages\/portal-ui\/(?:src\/|package\.json$|README\.md$|project\.json$)|.*\.mdx?$)/;
    expect(files.filter((f) => /heroui-pro|(?:^|\/)node_modules\//i.test(f)), "no vendored Pro, no node_modules").toEqual([]);
    expect(files.filter((f) => f.startsWith("packages/portal-ui/") && /^packages\/portal-ui\/(?:dist|node_modules)\/|\.tgz$/.test(f))).toEqual([]);
    const outside: Array<string> = [];
    const literal: Array<string> = [];
    for (const file of files) {
      if (/\.(?:png|jpe?g|gif|ico|woff2?|ttf|wasm|pdf|zip|tgz)$/.test(file)) continue;
      const text = readFileSync(join(repo, file), "utf8");
      if (text.includes("@heroui-pro") && !allowed.test(file)) outside.push(file);
      if (/HEROUI_AUTH_TOKEN["']?\s*[=:]\s*["']?(?!\$|\s|["'])[A-Za-z0-9_-]{12,}/.test(text)) literal.push(file);
    }
    expect(outside, "importers of Pro outside portal-ui").toEqual([]);
    expect(literal, "a committed token value").toEqual([]);
  });
});

describe("15 lint: a planted Pro import fails everywhere but portal-ui and spikes", () => {
  it("fails in a copy of packages/portal with the rule's message, for an import, a subpath and an export-from", () => {
    for (const [what, source] of [
      ["an import", importLine],
      ["a subpath import", `import { Chart } from "@heroui-pro/react/chart"; export const planted = Chart;\n`],
      ["an export from", `export { Button } from "@heroui-pro/react";\n`],
    ] as const) {
      const linted = lintMirror({ "packages/portal/src/planted.ts": source }, ["packages/portal"]);
      expect(bans(linted), `${what} in packages/portal must fail lint (exit ${linted.status}):\n${linted.out}`).toBe(true);
      expect(linted.out, "the message says where to import from").toContain("@orthograph/portal-ui");
    }
  });

  it("fails in a generated file of an example, where the rule must hold although lint skips generated/ today", () => {
    const linted = lintMirror({ "examples/acme/generated/api/planted.ts": importLine }, ["examples/acme/generated/api/planted.ts"]);
    expect(bans(linted), `a planted Pro import in generated code must fail lint (exit ${linted.status}):\n${linted.out}`).toBe(true);
  });

  it("passes in packages/portal-ui and under spikes/, after the same import failed in packages/portal", () => {
    const portal = lintMirror({ "packages/portal/src/planted.ts": importLine }, ["packages/portal"]);
    expect(bans(portal), `the same import must fail in packages/portal first:\n${portal.out}`).toBe(true);
    for (const path of ["packages/portal-ui/src/planted.tsx", "spikes/kanban/planted.ts"]) {
      const linted = lintMirror({ [path]: importLine }, [path]);
      expect(linted.out, `${path} may import Pro`).not.toMatch(/no-restricted-imports/);
      expect(linted.status, `${path}: ${linted.out}`).toBe(0);
    }
  });
});

describe("15 CI: the secret, the fork rule and the cache", () => {
  it("has a job that reads HEROUI_AUTH_TOKEN, runs on pushes and our pull requests, and never on a fork's", () => {
    const all = workflows();
    expect(all.length).toBeGreaterThan(0);
    const readings = all.map(([file, text]) => ({ file, reading: read(text) }));
    const refs = readings.flatMap(({ file, reading }) => reading.references.map((r) => ({ file, ...r })));
    expect(refs.length, "no job in .github/workflows reads secrets.HEROUI_AUTH_TOKEN: CI cannot install Pro").toBeGreaterThan(0);
    for (const { file, reading } of readings) expect(unsafe(reading), file).toEqual([]);
    for (const ref of refs) {
      expect(runsOn(ref, contexts.push), `${ref.where} must run on a push`).toBe(true);
      expect(runsOn(ref, contexts.sameRepo), `${ref.where} must run on a same-repository pull request`).toBe(true);
    }
  });

  it("builds portal-ui in that job, with Pro's install cached by the lockfile's hash before pnpm install", () => {
    const jobs = workflows().flatMap(([file, text]) => {
      const reading = read(text);
      const names = new Set(reading.references.map((r) => r.where.split(",")[0]!.replace("job ", "")));
      return [...names].map((name) => ({ file, name, steps: ((reading.jobs[name]?.steps ?? []) as Array<Record<string, any>>) }));
    });
    expect(jobs.length, "no job reads the token").toBeGreaterThan(0);
    for (const { file, name, steps } of jobs) {
      const at = `${file} job ${name}`;
      const scripts = steps.map((s) => String(s.run ?? ""));
      expect(scripts.some((s) => /portal-ui/.test(s) && /\bbuild\b/.test(s)), `${at} builds portal-ui`).toBe(true);
      const install = scripts.findIndex((s) => /pnpm install/.test(s));
      expect(install, `${at} runs pnpm install`).toBeGreaterThanOrEqual(0);
      const cache = steps.findIndex((s) => /^actions\/cache(?:\/restore)?@/.test(String(s.uses ?? "")) && /hashFiles\([^)]*pnpm-lock\.yaml/.test(String(s.with?.key ?? "")) && /node_modules|pnpm|heroui/i.test(String(s.with?.path ?? "")));
      expect(cache, `${at} has an actions/cache step keyed on hashFiles('pnpm-lock.yaml') covering the install`).toBeGreaterThanOrEqual(0);
      expect(cache, `${at}: the cache comes before pnpm install`).toBeLessThan(install);
      expect(String(steps[cache]!.with.key), "the key holds no secret").not.toMatch(/secrets\./);
    }
  });
});

describe("15 controls: the instruments", () => {
  it("the lint mirror reports a plain finding in a copy of packages/portal, and no ban for an ordinary import", () => {
    const linted = lintMirror({ "packages/portal/src/ok.ts": `debugger;\nimport { Effect } from "effect";\nexport const ok = Effect.void;\n` }, ["packages/portal/src/ok.ts"]);
    expect(linted.out).toMatch(/no-debugger/);
    expect(bans(linted)).toBe(false);
  });

  it("the dist scanner sees a vendored path, a banner and a stray mention, copied lines, and lets an external import be", () => {
    expect(proInside({ "dist/index.js": `import { Button } from "@heroui-pro/react";\nexport { Button };\n`, "dist/index.d.ts": `export * from "@heroui-pro/react/chart";\n`, "dist/index.js.map": `{"sources":["../src/index.ts"]}` })).toEqual([]);
    const manifest = (extra: Record<string, unknown>) => JSON.stringify({ name: "x", peerDependencies: { "@heroui-pro/react": "1.0.0-beta.11" }, peerDependenciesMeta: { "@heroui-pro/react": { optional: false } }, devDependencies: { "@heroui-pro/react": "1.0.0-beta.11" }, files: ["dist"], ...extra });
    expect(proInside({ "package.json": manifest({}) }), "the peer, its meta and the dev dependency are the seam's own declaration").toEqual([]);
    expect(proInside({ "package.json": manifest({ bundleDependencies: ["@heroui-pro/react"] }) })).toHaveLength(1);
    expect(proInside({ "package.json": manifest({ dependencies: { "@heroui-pro/react": "1.0.0" } }) })).toHaveLength(1);
    expect(proInside({ "package.json": manifest({ files: ["dist", "node_modules/@heroui-pro/react"] }) }).length).toBeGreaterThan(0);
    expect(proInside({ "package.json": manifest({ scripts: { build: "cp -r @heroui-pro/react/dist dist" } }) })).toHaveLength(1);
    expect(proInside({ "dist/vendor/heroui-pro/button.js": "x" })).toHaveLength(1);
    expect(proInside({ "dist/a.js.map": `{"sources":["../node_modules/.pnpm/@heroui-pro+react@1/node_modules/@heroui-pro/react/dist/a.js"]}` })).toHaveLength(1);
    expect(proInside({ "dist/a.js": `/*! @license HeroUI Pro */ export {};` })).toHaveLength(1);
    expect(proInside({ "dist/a.js": `/* inlined from @heroui-pro/react/button */ export {};` })).toHaveLength(1);
    const fake = mkdtempSync(join(tmpdir(), "ortho-fakepro-"));
    try {
      const line = "export const label = (props) => props.children + props.isDisabled + props.isLoading + props.variant + props.size + props.color;";
      mkdirSync(join(fake, "dist"));
      writeFileSync(join(fake, "dist/b.js"), `${line}\n`);
      expect(copiedFrom(fake, { "dist/ours.js": `// ours\n${line}\n` })).toHaveLength(1);
      expect(copiedFrom(fake, { "dist/ours.js": `export const label = (props) => props.children;\n` })).toEqual([]);
    } finally { rmSync(fake, { recursive: true, force: true }); }
  });

  it("the workflow reader catches an unguarded job, a workflow-wide token, a run-script token and pull_request_target, and passes guards", () => {
    const job = (extra: string, trigger = "pull_request") => `on: [push, ${trigger}]\njobs:\n  pro:\n${extra}    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n        env:\n          HEROUI_AUTH_TOKEN: \${{ secrets.HEROUI_AUTH_TOKEN }}\n`;
    expect(unsafe(read(job("")))).toHaveLength(1);
    expect(unsafe(read(job("    if: github.event.pull_request.head.repo.full_name == github.repository\n")))).toEqual([]);
    expect(unsafe(read(job("    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository\n")))).toEqual([]);
    expect(unsafe(read(job("    if: ${{ always() }}\n")))).toHaveLength(1);
    expect(unsafe(read(job("", "pull_request_target")))).toHaveLength(1);
    expect(unsafe(read(`on: pull_request\nenv:\n  T: \${{ secrets.HEROUI_AUTH_TOKEN }}\njobs:\n  a:\n    runs-on: x\n    steps: [{ run: echo }]\n`))).toHaveLength(1);
    expect(unsafe(read(`on: [push]\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo \${{ secrets.HEROUI_AUTH_TOKEN }}\n`))).toHaveLength(1);
    expect(unsafe(read(`on: pull_request\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo \${{ secrets.HEROUI_AUTH_TOKEN }}\n        if: github.event.pull_request.head.repo.full_name == github.repository\n`))).toHaveLength(1);
    const guarded = read(job("    if: github.event.pull_request.head.repo.full_name == github.repository\n")).references[0]!;
    expect(runsOn(guarded, contexts.sameRepo)).toBe(true);
    expect(runsOn(guarded, contexts.push), "this guard keeps the job off pushes").toBe(false);
    expect(() => evaluate("contains(github.ref, 'x')", contexts.fork)).toThrow();
  });
});
