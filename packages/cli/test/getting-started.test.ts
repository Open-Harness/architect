// Slice 7 of Goal 18 (#1065): the getting-started page, `docs/canon/getting-started.mdx`: one page from install to a proved,
// running app and its generated tools (the `<APP>_URL` and `<APP>_TOKEN` they read).
// The page's steps are RUN by e2e/m2/09-g18-7-getting-started.test.ts, in an empty folder against a local registry: that is
// where "it works" is judged. This file is the fast half: it holds the page to the code, without installing anything.
//
// What the page must say is checked against the code, not against itself: the commands and flags it shows are looked up in
// `ortho --help` (test/help-tree.ts), the variable names are derived the way the generated CLI derives them
// (packages/projections/src/modules/cli/internal/cli.ts), the address a generated CLI falls back to is read from a
// generated CLI (examples/plugged-in/generated/cli/src/main.ts), and the Node version from the root package.json.
// The command that creates an app, `ortho new app <name>` or `npm create orthograph <name>`, is slice 6's (#1082): the page
// may name it, and this file does not check what it does.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { walk, type Page } from "./help-tree.ts";

const repo = resolve(import.meta.dirname, "../../..");
const read = (path: string): string => {
  try {
    return readFileSync(resolve(repo, path), "utf8");
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
    expect(read("README.md")).toContain("docs/canon/getting-started.mdx");
    expect(read("packages/cli/README.md")).toContain("getting-started");
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

  /** Longest command path in `ortho --help` that starts the words, and the words left over. `ortho new app` is slice 6's, allowed by name. */
  const resolveCommand = (words: ReadonlyArray<string>) => {
    for (let n = Math.min(words.length, 3); n >= 1; n--) {
      const path = words.slice(0, n).join(" ");
      const known = tree.get(path) ?? (path === "new app" ? ({ flags: [], subcommands: [] } as unknown as Page) : undefined);
      if (known) return { path, rest: words.slice(n), page: known };
    }
    return undefined;
  };

  it("shows at least one `ortho` command", () => {
    expect(lines.filter((l) => l.startsWith("ortho ")).length).toBeGreaterThan(0);
  });

  it("each `ortho <command>` is a command `ortho --help` lists", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    const unknown = lines.filter((l) => /^ortho\s/.test(l)).filter((l) => !resolveCommand(l.split(/\s+/).slice(1).filter((w) => !w.startsWith("-"))));
    expect(unknown).toEqual([]);
  });

  it("each `--flag` after it is one that command has, or a global one", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    const wrong: string[] = [];
    for (const l of lines.filter((x) => /^ortho\s/.test(x))) {
      const words = l.split(/\s+/).slice(1);
      const found = resolveCommand(words.filter((w) => !w.startsWith("-")));
      if (!found || found.path === "new app") continue;
      const has = found.page.flags.flatMap((f) => f.names);
      for (const w of words.filter((x) => x.startsWith("--"))) if (!["--help", "--version", "--log-level"].includes(w.split("=")[0] ?? w) && !has.includes(w.split("=")[0] ?? w)) wrong.push(`${l}  (${w})`);
    }
    expect(wrong).toEqual([]);
  });
});
