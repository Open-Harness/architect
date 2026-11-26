// Slice 7 of Goal 18 (#1065): the getting-started page, `docs/canon/getting-started.mdx`: one page from install to a proved,
// running app and its generated tools (the `<APP>_URL` and `<APP>_TOKEN` they read).
// Running the page's steps (in an empty folder, against a local registry) is slice 11's acceptance check
// (design/decisions/GOAL18-getting-started-acceptance.md). This file holds the page to the code, without installing anything.
//
// What the page must say is checked against the code, not against itself: the commands and flags it shows are looked up in
// `ortho --help` (test/help-tree.ts), the variable names are derived the way the generated CLI derives them
// (packages/projections/src/modules/cli/internal/cli.ts), the address a generated CLI falls back to is read from a
// generated CLI (examples/plugged-in/generated/cli/src/main.ts), and the Node version from the root package.json.
// The command that creates an app, `ortho new app <name>` or `npm create orthograph <name>`, is slice 6's (#1082): the page
// may name it, and this file does not check what it does.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { walk, type Page } from "./help-tree.ts";

const repo = resolve(import.meta.dirname, "../../..");
// What a reader sees: the file without its HTML comments (`<!-- ... -->`) and MDX comments (an open brace, slash, star ... star,
// slash, close brace), which render as nothing.
const visible = (text: string): string => text.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
/** A file as a reader sees it (comments are not read), `""` when it does not exist. */
const read = (path: string): string => {
  try {
    return visible(readFileSync(resolve(repo, path), "utf8"));
  } catch {
    return "";
  }
};
const page = read("docs/canon/getting-started.mdx");

/** The lines of every fenced block, in order, with a leading `$ `, any `NAME=value ` and a runner (`pnpm`, `npx`, `npm exec`) before `ortho` taken off. */
const fenceLines = (text: string): ReadonlyArray<string> => {
  const out: string[] = [];
  let inside = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) inside = !inside;
    // A line is cut at `&&`, `||`, `;` and `|`, so `true || ortho frobnicate` is judged as `ortho frobnicate` too.
    else if (inside)
      for (const part of line.trim().replace(/^\$\s+/, "").split(/&&|\|\||;|\|/))
        out.push(
          part
            .trim()
            .replace(/^(?:[A-Z][A-Z0-9_]*=\S+\s+)+/, "")
            .replace(/^(?:(?:pnpm|yarn|bun)(?:\s+exec)?\s+|npx\s+(?:--yes\s+)?|npm\s+exec\s+(?:--\s+)?)(?=ortho\s)/, ""),
        );
  }
  return out;
};
const lines = fenceLines(page);
/** The prose: the page without its fences and without its frontmatter. */
const prose = page.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/```[\s\S]*?```/g, "");

/** How the generated CLI turns an app's name into its variable prefix (`cli.ts`: `name.toUpperCase().replace(/-/g, "_")`). */
const prefixOf = (name: string) => name.toUpperCase().replace(/-/g, "_");

const CREATE = /^(?:ortho new app|(?:npm|pnpm|yarn|bun) (?:create|init) orthograph(?:@\S+)?|npx (?:--yes )?create-orthograph(?:@\S+)?)\s+([a-z][a-z0-9-]*)\b/;

describe("the getting-started page exists and is a canon page", () => {
  it("is docs/canon/getting-started.mdx, titled Getting started", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(/^---\n[\s\S]*?^title: Getting started\s*$[\s\S]*?\n---\n/m.test(page), "its frontmatter has `title: Getting started`").toBe(true);
  });

  it("passes the canon's own check (frontmatter, the eight sections, the outline, quotes, retired words)", { timeout: 120_000 }, () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    const ran = spawnSync("node", ["docs/canon/check.mjs"], { cwd: repo, encoding: "utf8" });
    expect(`${ran.stdout}${ran.stderr}`).not.toMatch(/getting-started/);
    expect(ran.status, `${ran.stdout}${ran.stderr}`).toBe(0);
  });

  it("is in the outline, in the canon's row format", () => {
    expect(read("docs/canon/outline.md")).toMatch(/^\| \d+ \| \*{0,2}`getting-started`/m);
  });

  it("is linked from the repository's README and from the CLI's README", () => {
    const target = resolve(repo, "docs/canon/getting-started.mdx");
    /** The targets of a file's markdown links, resolved from the file's own folder. */
    const links = (file: string) => [...read(file).matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)].map((m) => resolve(repo, dirname(file), m[1] ?? ""));
    expect(links("README.md"), "README.md links the page").toContain(target);
    expect(links("packages/cli/README.md"), "packages/cli/README.md links the page").toContain(target);
  });
});

describe("it says what a reader needs first", () => {
  it("names the Node version the repository requires", () => {
    const engines = (JSON.parse(read("package.json")) as { readonly engines: { readonly node: string } }).engines.node;
    const major = /\d+/.exec(engines)?.[0] ?? "?";
    const near = [...prose.matchAll(/\bNode(?:\.js)?\b([^\n]{0,40})/g)].map((m) => m[1] ?? "");
    expect(near.some((t) => new RegExp(`\\b${major}\\b`).test(t)), "a Node requirement, with the major version from package.json engines").toBe(true);
    const others = near.flatMap((t) => [...t.matchAll(/\b(\d{2})\b/g)].map((m) => m[1])).filter((n) => n !== major);
    expect(others, "no other Node version beside it (\"Node 22 or so; 24 …\")").toEqual([]);
  });

});

describe("it names the generated tools and what they read", () => {
  it("names `<APP>_URL` and `<APP>_TOKEN`, and says how an app's name becomes the prefix", () => {
    expect(prose).toContain("`<APP>_URL`");
    expect(prose).toContain("`<APP>_TOKEN`");
    expect(prose, "upper case, with dashes as underscores").toMatch(/upper[- ]?case/i);
    expect(prose).toMatch(/dash|hyphen/i);
  });

  it("names the generated CLI, SDK and MCP, each in its own sentence", () => {
    for (const tool of ["CLI", "SDK", "MCP"]) expect(prose.split(/(?<=[.!?])\s/).some((s) => s.includes(tool) && /generated/i.test(s)), `a sentence about the generated ${tool}`).toBe(true);
  });

  it("shows the variables for the app it creates, derived the way the generated CLI derives them", () => {
    const name = CREATE.exec(lines.find((l) => CREATE.test(l)) ?? "")?.[1];
    expect(name, "an app name on the create command").toBeDefined();
    const want = prefixOf(name ?? "");
    expect(page).toContain(`${want}_URL`);
    expect(page).toContain(`${want}_TOKEN`);
    const concrete = [...page.matchAll(/\b([A-Z][A-Z0-9_]*)_(?:URL|TOKEN)\b/g)].map((m) => m[1]);
    expect(concrete.filter((p) => p !== want), "a variable for some other app than the one created").toEqual([]);
  });

  it("agrees with a generated CLI on the address it talks to when nothing is set", () => {
    const cli = read("examples/plugged-in/generated/cli/src/main.ts");
    const fallback = /_URL"\] \?\? "([^"]+)"/.exec(cli)?.[1];
    expect(fallback, "the generated CLI's fallback address").toBeDefined();
    expect(prose, "the prose says where the generated tools talk to when `<APP>_URL` is not set").toContain(fallback ?? "\u0000");
  });

});

describe("every command and flag it shows exists", () => {
  let tree: ReadonlyMap<string, Page>;
  beforeAll(async () => {
    tree = await walk();
  }, 240_000);

  /**
   * A fence line read as the parser reads it: the longest run of leading words that is a command in `ortho --help` (`ortho new
   * app`, slice 6's, is allowed by name, with its one name), then the rest in order. A flag that takes a value takes the next
   * word; every other word is a positional argument, and a command takes no more of them than it declares. So
   * `ortho env frobnicate` (a group, no arguments) and `ortho prove staging` (a leaf, none) are wrong, as readmes.test.ts reads them.
   */
  const judge = (line: string): { readonly path: string; readonly wrong: ReadonlyArray<string> } => {
    const words = line.split(/\s+/).slice(1).filter((w) => w !== "" && !/^[<[{]/.test(w));
    let path = "";
    for (let n = Math.min(words.length, 3); n >= 1; n--) {
      const candidate = words.slice(0, n).join(" ");
      if (tree.has(candidate) || (candidate === "new app" && !tree.has("new app"))) { path = candidate; break; }
    }
    if (path === "") return { path, wrong: [`${line}  (no such command)`] };
    const page = tree.get(path);
    const args = path === "new app" && page === undefined ? 1 : (page?.args.length ?? 0);
    const flags = page?.flags ?? [];
    const wrong: string[] = [];
    let positional = 0;
    const rest = words.slice(path.split(" ").length);
    for (let i = 0; i < rest.length; i++) {
      const w = rest[i] ?? "";
      if (!w.startsWith("-")) { positional++; continue; }
      const f = w.split("=")[0] ?? w;
      if (["--log-level", "--completions"].includes(f)) { if (!w.includes("=")) i++; continue; }
      if (["--help", "-h", "--version", "-v", "--wizard"].includes(f)) continue;
      const flag = flags.find((x) => x.names.includes(f));
      if (flag === undefined && !(path === "new app" && page === undefined)) wrong.push(`${line}  (${f})`);
      if (flag?.takesValue && !w.includes("=")) i++;
    }
    if (positional > args) wrong.push(`${line}  (\`ortho ${path}\` takes ${args} argument(s), and ${positional} were given)`);
    return { path, wrong };
  };

  it("shows at least one `ortho` command", () => {
    expect(lines.filter((l) => l.startsWith("ortho ")).length).toBeGreaterThan(0);
  });

  it("each `ortho <command>` is a command `ortho --help` lists", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    // A word after a command that is neither a flag, a flag's value nor one of its declared arguments is an unknown subcommand.
    const unknown = lines.filter((l) => /^ortho\s/.test(l)).flatMap((l) => judge(l).wrong.filter((w) => !/\(--?[\w-]+\)$/.test(w)));
    expect(unknown).toEqual([]);
  });

  it("each `--flag` after it is one that command has, or a global one", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    const wrong = lines.filter((l) => /^ortho\s/.test(l)).flatMap((l) => judge(l).wrong.filter((w) => /\(--?[\w-]+\)$/.test(w)));
    expect(wrong).toEqual([]);
  });
});
