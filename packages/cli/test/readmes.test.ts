// Slice 7 of Goal 18 (#1065): the stale READMEs. The CLI's says it has only `model`; seven packages' say "Arrives in
// layer 1" about code that is built. What is true is read from the code: the CLI's commands from `ortho --help`, a
// package's being built from the source files it has.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { walk } from "./help-tree.ts";

const repo = resolve(import.meta.dirname, "../../..");
// What a reader sees: the file without its HTML comments (`<!-- ... -->`) and MDX comments (an open brace, slash, star ... star,
// slash, close brace), which render as nothing.
const visible = (text: string): string => text.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
/** A missing README is not a stale one: it reads as "" (the packages with none are not this slice's). Comments are not read. */
const read = (path: string): string => {
  try {
    return visible(readFileSync(resolve(repo, path), "utf8"));
  } catch {
    return "";
  }
};

const sourceFiles = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce((n, d) => {
    const p = join(dir, d.name);
    return n + (d.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? 1 : 0);
  }, 0);

describe("the CLI's README says what the CLI does", () => {
  it("names every top-level command `ortho --help` lists, as `ortho <command>`, and every `ortho …` it shows is a real command with its real flags", async () => {
    const readme = read("packages/cli/README.md");
    const tree = await walk();
    const top = tree.get("")?.subcommands.map((s) => s.names[0] ?? "") ?? [];
    expect(top.length, "ortho --help lists commands").toBeGreaterThan(10);
    expect(top.filter((c) => !new RegExp(`ortho ${c}\\b`).test(readme))).toEqual([]);
    // Each mention, anywhere (prose, bold, quotes, code): `ortho` as a word of its own and the words after it, up to the end of
    // the code span, the emphasis, the quote, the bracket or the line. The longest known command path wins; what follows it may
    // be its arguments (as many as it declares, `<placeholders>` aside) and its flags, long or short.
    const wrong: string[] = [];
    for (const m of readme.matchAll(/(?<![\w/@.-])ortho((?:[ \t]+[^`*"'()[\]\n;|]*)?)/g)) {
      const words = (m[1] ?? "").trim().split(/\s+/).filter((w) => w !== "" && !/^[<[{]/.test(w)).map((w) => w.replace(/[.,:]+$/, ""));
      // The command path: the longest run of leading words that is a command.
      let path = "";
      for (let n = Math.min(words.length, 3); n >= 1; n--) if (tree.has(words.slice(0, n).join(" "))) { path = words.slice(0, n).join(" "); break; }
      if (words[0] === "new" && words[1] === "app" && !tree.has("new app")) continue; // slice 6's, judged by its own check
      if (words.length > 0 && !words[0]?.startsWith("-") && path === "") { wrong.push(`ortho ${words.join(" ")} (no such command)`); continue; }
      const page = tree.get(path);
      const flags = page?.flags ?? [];
      const global = ["--help", "-h", "--version", "-v", "--wizard"];
      let positional = 0;
      const rest = words.slice(path === "" ? 0 : path.split(" ").length);
      for (let i = 0; i < rest.length; i++) {
        const w = rest[i] ?? "";
        if (!w.startsWith("-")) { positional++; continue; }
        const f = w.split("=")[0] ?? w;
        if (["--log-level", "--completions"].includes(f)) { if (!w.includes("=")) i++; continue; }
        const flag = flags.find((x) => x.names.includes(f));
        if (flag === undefined && !global.includes(f)) wrong.push(`ortho ${words.join(" ")} (${f})`);
        if (flag?.takesValue && !w.includes("=")) i++;
      }
      if (positional > (page?.args.length ?? 0)) wrong.push(`ortho ${words.join(" ")} (\`ortho ${path}\` takes ${page?.args.length ?? 0} argument(s))`);
    }
    expect(wrong).toEqual([]);
  }, 300_000);

  it("does not say it has only `model`, or that the list is \"so far\"", () => {
    const readme = read("packages/cli/README.md");
    expect(readme).not.toMatch(/so far/i);
    expect(readme).not.toMatch(/commands?:?\s+`ortho model[^`]*`\.\s*$/m);
  });

  it("points to --help for each command's flags", () => {
    expect(read("packages/cli/README.md")).toContain("ortho --help");
  });

  it("links the getting-started page by a link that resolves from the README's own folder", () => {
    const links = [...read("packages/cli/README.md").matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)].map((m) => resolve(repo, "packages/cli", m[1] ?? ""));
    expect(links, "a markdown link to docs/canon/getting-started.mdx").toContain(resolve(repo, "docs/canon/getting-started.mdx"));
  });
});

/** The built packages whose README said "Arrives in layer" on 26 November 2026, and the CLI's. */
const STALE = ["cli", "generators", "host-cloudflare", "language-effect", "lint", "orthograph", "preset", "prove"];

describe("a package whose code is built does not say it is still to arrive", () => {
  const packages = readdirSync(resolve(repo, "packages")).filter((p) => statSync(resolve(repo, "packages", p)).isDirectory());
  const built = packages.filter((p) => {
    try {
      return sourceFiles(resolve(repo, "packages", p, "src")) >= 3;
    } catch {
      return false;
    }
  });

  it("finds the built packages", () => {
    expect(built).toEqual(expect.arrayContaining(["cli", "orthograph", "prove", "preset", "generators", "host-cloudflare", "language-effect", "lint"]));
  });

  it.each(built)("packages/%s/README.md has no \"Arrives in layer\" placeholder", (p) => {
    const text = read(`packages/${p}/README.md`).replace(/\s+/g, " ");
    // The READMEs this slice rewrites must stay (a deleted one reads as "" and would pass); a package that never had one is not this slice's.
    if (STALE.includes(p)) expect(text, `packages/${p}/README.md exists and says something`).not.toBe("");
    // The placeholder in any wording: "Arrives in layer 1", "Coming in layer 2", "lands with layer 1", "layer 1: to come".
    expect(text).not.toMatch(/\b(?:arriv|com|land)\w*\s+(?:in|with)\s+layer\b|\blayer\s*\d+\W{0,3}\s*(?:to come|not yet|later)\b/i);
  });

  it("language-solidity, with one empty file of source, may still say it is to come", () => {
    expect(built).not.toContain("language-solidity");
  });
});

describe("the example's README matches its state", () => {
  it("plugged-in's README does not say it has empty handlers only", () => {
    expect(read("examples/plugged-in/README.md")).not.toMatch(/empty handlers only|without sign-in: declarations/i);
  });
});
