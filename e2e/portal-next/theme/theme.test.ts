// Goal 6, slice 1, "The theme": the check, written first and failing (goal brief `design/goals/06-portal.md`, slice 1).
//
// Done when (the brief): "a fixture page on it in Chromium resolves every `--ui-*` token to the theme's value, in both
// schemes, and builds with `HEROUI_AUTH_TOKEN` unset."
//
// THE CONTRACT THE BUILDER MEETS (the lead's call; this file is written to it):
//  - Package `@orthograph/theme` at `packages/theme/`, nx project `theme`. Its stylesheet is published at
//    `@orthograph/theme/theme.css` (a file in the package or a build output), and its values at the package root as
//    `tokens: { light: Record<string, string>, dark: Record<string, string> }`, keyed by custom property name
//    (`"--ui-background"`). Every `exports` entry carries a `default` condition, since the check resolves them the way
//    Node's `require.resolve` does, from the package's own folder (so e2e needs no dependency on it).
//  - Schemes: the stylesheet follows `prefers-color-scheme`, and `data-theme="light"` or `data-theme="dark"` on `<html>`
//    overrides it both ways.
//  - The theme declares every token itself and never leans on UI SDK's defaults. "Every token" is every `--ui-*` custom
//    property that `@ui-sdk/core/web.css` (workspace pin 0.1.0-beta.10) declares on `:root`, read from that file, never
//    typed here. Properties that file sets only on one component's selector (`--ui-icon`, `--ui-icon-size`, `--ui-checker`,
//    `--ui-grid-line`, `--ui-rating-*`, `--ui-tree-indent`) are that component's own and are not tokens.
//  - A token's value is the string the browser computes for it on `:root`, compared with runs of whitespace collapsed to one
//    space and the space after a comma made one (`system-ui,sans-serif` is `system-ui, sans-serif`; a two-line shadow is one
//    line). A token that is one string in both schemes (a radius) is that string in `tokens.light` and `tokens.dark`; one
//    that differs is written per scheme.
//  - `light-dark(` appears nowhere in `theme.css`: a custom property does not resolve it, so a token written with it holds
//    the same string in both schemes and would not follow `data-theme`. And `:root` sets `color-scheme` to the scheme in
//    force: the computed `color-scheme` is `light` under light (emulated or `data-theme="light"`) and `dark` under dark.
//  - The theme contains no HeroUI, and `nx run theme:build` exits 0 with `HEROUI_AUTH_TOKEN` removed from its environment.
//
// The clauses (the names below are the test names): 1 the token list is read from web.css; 2 the theme alone, both
// schemes, and `data-theme` winning both ways; 3 web.css and the theme together, in both orders (web.css first, theme first), the theme's values win, and its
// stylesheet never imports UI SDK's (no `@ui-sdk` or `web.css` in it) and never writes `light-dark(`; 4 the two
// schemes differ at surface and text; 5 no HeroUI anywhere under the package, and the build with the token stripped.
// The fixture page holds only link tags and the document element's attribute: no markup of the theme's own.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Scheme = "light" | "dark";
type Tokens = Readonly<Record<Scheme, Readonly<Record<string, string>>>>;
type Theme = { readonly css: string; readonly tokens: Tokens };

const root = fileURLToPath(new URL("../../..", import.meta.url));
const packageDir = join(root, "packages/theme");
const SCHEMES: readonly Scheme[] = ["light", "dark"];
const other = (scheme: Scheme): Scheme => (scheme === "light" ? "dark" : "light");
const show = (value: string | undefined): string => (value === undefined ? "(missing)" : JSON.stringify(value.length > 70 ? `${value.slice(0, 70)}...` : value));

/** Clause 1: every `--ui-*` custom property declared on `:root`, read from UI SDK's web.css at the workspace pin. */
const tokenNames = (): { readonly names: readonly string[]; readonly webCss: string } => {
  const webCss = createRequire(import.meta.url).resolve("@ui-sdk/core/web.css");
  const text = readFileSync(webCss, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const names = new Set<string>();
  let depth = 0;
  let start = 0;
  let selector = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 1) { selector = text.slice(start, i); start = i + 1; }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 1 && /:root/.test(selector)) {
        for (const m of text.slice(start, i).matchAll(/(?:^|[;{\s])(--ui-[a-z0-9-]+)\s*:/g)) names.add(m[1] ?? "");
      }
      if (depth <= 1) start = i + 1;
    }
  }
  return { names: [...names].sort(), webCss };
};

/** The theme, through its own exports. It is not a static import: the package may not exist yet, and e2e must typecheck without it. */
const requirePackage = (): void => {
  if (!existsSync(join(packageDir, "package.json"))) throw new Error(`@orthograph/theme can't be resolved: ${join(packageDir, "package.json")} does not exist`);
};
const resolveTheme = (): { readonly css: string; readonly entry: string } => {
  requirePackage();
  const fromPackage = createRequire(join(packageDir, "package.json"));
  try {
    return { css: fromPackage.resolve("@orthograph/theme/theme.css"), entry: fromPackage.resolve("@orthograph/theme") };
  } catch (error) {
    throw new Error(`@orthograph/theme can't be resolved through its exports ("./theme.css" and "."): ${String(error).split("\n")[0]}`, { cause: error });
  }
};

const build = (): { readonly status: number | null; readonly output: string } => {
  const env: NodeJS.ProcessEnv = { ...process.env, NX_DAEMON: "false" };
  delete env["HEROUI_AUTH_TOKEN"];
  const run = spawnSync(join(root, "node_modules/.bin/nx"), ["run", "theme:build", "--outputStyle=static"], { cwd: root, env, encoding: "utf8", timeout: 240_000 });
  return { status: run.status, output: `${run.stdout}${run.stderr}`.slice(-1500) };
};

let built: ReturnType<typeof build> | undefined;
const loadTheme = async (): Promise<Theme> => {
  requirePackage();
  built ??= build();
  if (built.status !== 0) throw new Error(`nx run theme:build failed (exit ${String(built.status)}):\n${built.output}`);
  const { css, entry } = resolveTheme();
  const loaded: unknown = await import(/* @vite-ignore */ pathToFileURL(entry).href);
  const tokens = (loaded as { readonly tokens?: Tokens }).tokens;
  if (tokens === undefined || typeof tokens.light !== "object" || typeof tokens.dark !== "object") throw new Error("@orthograph/theme exports no `tokens: { light, dark }`");
  return { css, tokens };
};

let browser: Browser;
let dir: string;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); dir = mkdtempSync(join(tmpdir(), "theme-fixture-")); });
afterAll(async () => { await browser.close(); rmSync(dir, { recursive: true, force: true }); });

/** Opens the fixture page (only the named stylesheets, in order) under an emulated scheme, with `data-theme` set or not, and reads every token on `:root`, and its computed `color-scheme`. */
type Read = { readonly values: Record<string, string>; readonly colorScheme: string };
const read = async (sheets: readonly string[], names: readonly string[], emulate: Scheme, attribute: Scheme | undefined): Promise<Read> => {
  const file = join(dir, `page-${String(readdirSync(dir).length)}.html`);
  const links = sheets.map((sheet) => `<link rel="stylesheet" href="${pathToFileURL(sheet).href}">`).join("");
  writeFileSync(file, `<!doctype html><html${attribute === undefined ? "" : ` data-theme="${attribute}"`}><head>${links}</head><body>fixture</body></html>`);
  const page = await (await browser.newContext({ colorScheme: emulate })).newPage();
  try {
    await page.goto(pathToFileURL(file).href);
    await page.evaluate("document.fonts.ready.then(() => undefined)");
    return (await page.evaluate(`({ values: (${JSON.stringify(names)}).reduce((all, n) => ({ ...all, [n]: getComputedStyle(document.documentElement).getPropertyValue(n).trim() }), {}), colorScheme: getComputedStyle(document.documentElement).colorScheme })`)) as Read;
  } finally {
    await page.context().close();
  }
};

const squash = (value: string): string => value.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
const mismatches = (names: readonly string[], got: Read, expected: Readonly<Record<string, string>>, scheme: Scheme): string[] => [
  ...names.filter((n) => { const want = expected[n]; return want === undefined || squash(want) === "" || squash(got.values[n] ?? "") !== squash(want); })
    .map((n) => `${n}: the page resolved ${show(got.values[n])}, the theme's tokens say ${show(expected[n])}`),
  ...(got.colorScheme === scheme ? [] : [`color-scheme: the page computed ${show(got.colorScheme)}, the scheme in force is "${scheme}"`]),
];

const cases = SCHEMES.flatMap((emulate) => [
  { title: `${emulate} emulation, no data-theme`, emulate, attribute: undefined, scheme: emulate },
  { title: `${emulate} emulation, data-theme="${other(emulate)}" wins`, emulate, attribute: other(emulate), scheme: other(emulate) },
]);

describe("@orthograph/theme (Goal 6, slice 1)", () => {
  it("clause 1: the token list comes from web.css, and is not empty", () => {
    const { names } = tokenNames();
    expect(names.length, `tokens read from @ui-sdk/core/web.css: ${names.join(" ")}`).toBeGreaterThanOrEqual(19);
    expect(names).toEqual(expect.arrayContaining(["--ui-background", "--ui-foreground", "--ui-border", "--ui-radius", "--ui-font-sans", "--ui-shadow"]));
    expect(names.every((n) => n.startsWith("--ui-"))).toBe(true);
  });

  describe("clause 2: the theme's stylesheet alone, no web.css", () => {
    for (const c of cases) {
      it(`resolves every token to tokens.${c.scheme} under ${c.title}`, async () => {
        const { names } = tokenNames();
        const theme = await loadTheme();
        expect(mismatches(names, await read([theme.css], names, c.emulate, c.attribute), theme.tokens[c.scheme], c.scheme)).toEqual([]);
      });
    }
  });

  describe("clause 3: web.css and the theme together, in either order", () => {
    for (const order of ["web.css first, then the theme", "the theme first, then web.css"] as const) {
      for (const c of cases) {
        it(`${order}: the theme's values win under ${c.title}`, async () => {
          const { names, webCss } = tokenNames();
          const theme = await loadTheme();
          const sheets = order.startsWith("web.css") ? [webCss, theme.css] : [theme.css, webCss];
          expect(mismatches(names, await read(sheets, names, c.emulate, c.attribute), theme.tokens[c.scheme], c.scheme)).toEqual([]);
        });
      }
    }
  });

  it("clause 3: the stylesheet does not import UI SDK's own, and never writes light-dark(", async () => {
    const theme = await loadTheme();
    const text = readFileSync(theme.css, "utf8");
    expect(text).not.toMatch(/@ui-sdk|web\.css/i);
    expect(text).not.toMatch(/light-dark\(/i);
  });

  it("clause 4: light and dark differ at the surface and the text", async () => {
    const { names } = tokenNames();
    const { tokens } = await loadTheme();
    for (const scheme of SCHEMES) expect(Object.keys(tokens[scheme]), `tokens.${scheme} lacks a token`).toEqual(expect.arrayContaining([...names]));
    for (const name of ["--ui-background", "--ui-foreground"]) {
      expect(tokens.light[name], `${name} in light`).toBeTruthy();
      expect(tokens.dark[name], `${name} must differ between the schemes`).not.toBe(tokens.light[name]);
    }
  });

  it("clause 5: nothing under packages/theme names HeroUI", () => {
    requirePackage();
    const files = (folder: string): string[] => readdirSync(folder, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" ? [] : e.isDirectory() ? files(join(folder, e.name)) : [join(folder, e.name)]));
    const hits = files(packageDir).filter((f) => /@heroui|--heroui|heroui-pro|heroui\.com/i.test(readFileSync(f, "utf8")));
    expect(hits, "files that name HeroUI").toEqual([]);
  });

  it("clause 5: `nx run theme:build` exits 0 with HEROUI_AUTH_TOKEN removed from its environment", () => {
    requirePackage();
    built ??= build();
    expect(built.status, built.output).toBe(0);
  }, 300_000);
});
