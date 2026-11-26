// Slice 7 of Goal 18 (#1065): the stale READMEs. The CLI's says it has only `model`; seven packages' say "Arrives in
// layer 1" about code that is built. What is true is read from the code: the CLI's commands from `ortho --help`, a
// package's being built from the source files it has.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { helpOf } from "./help-tree.ts";

const repo = resolve(import.meta.dirname, "../../..");
/** A missing README is not a stale one: it reads as "" (the packages with none are not this slice's). */
const read = (path: string): string => {
  try {
    return readFileSync(resolve(repo, path), "utf8");
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
  it("names every top-level command `ortho --help` lists, as `ortho <command>`", async () => {
    const readme = read("packages/cli/README.md");
    const root = await helpOf([]);
    expect(root.subcommands.length, "ortho --help lists commands").toBeGreaterThan(10);
    const missing = root.subcommands.map((s) => s.names[0] ?? "").filter((c) => !new RegExp(`ortho ${c}\\b`).test(readme));
    expect(missing).toEqual([]);
  }, 60_000);

  it("does not say it has only `model`, or that the list is \"so far\"", () => {
    const readme = read("packages/cli/README.md");
    expect(readme).not.toMatch(/so far/i);
    expect(readme).not.toMatch(/commands?:?\s+`ortho model[^`]*`\.\s*$/m);
  });

  it("points to --help for each command's flags", () => {
    expect(read("packages/cli/README.md")).toContain("ortho --help");
  });
});

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
    expect(read(`packages/${p}/README.md`)).not.toMatch(/Arrives in layer/i);
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
