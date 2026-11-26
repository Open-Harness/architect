// The preset writes the starter under a new name: the starter's own blueprint, handlers and journeys, generated/
// rendered for the new name, and a project around them that installs @orthograph at the preset's version.
import { resolve } from "node:path";
import { createTreeWithEmptyWorkspace } from "nx/src/generators/testing-utils/create-tree-with-empty-workspace.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Starter } from "./service.ts";
import { AGE_EXEMPT, WORKSPACE, addToList, mergeWorkspace } from "./internal/project.ts";

const starter = resolve(import.meta.dirname, "../../../../../examples/starter");

describe("the starter preset", () => {
  const tree = createTreeWithEmptyWorkspace();
  const source = Starter.read(starter, "1.2.3");
  const install = Starter.write(tree, { name: "bakery" }, source);

  it("copies the starter's blueprint, handlers and journeys unchanged", () => {
    for (const f of source.files) expect(tree.read(f.path, "utf8"), f.path).toBe(f.content);
    expect(source.files.some((f) => f.path === "src/session/sign-in.ts")).toBe(true);
    expect(source.files.some((f) => f.path.startsWith("journeys/"))).toBe(true);
  });

  it("renders generated/ under the new name, and writes no scaffold over a handler", () => {
    expect(tree.exists("generated/server/main.ts")).toBe(true);
    expect(tree.read("generated/cli/src/main.ts", "utf8")).toContain("bakery");
    expect(tree.read("generated/cli/src/main.ts", "utf8")).not.toContain("starter");
    // The written handler, not a blank one: a scaffold would reach a BlankReached.
    expect(tree.read("src/session/sign-in.ts", "utf8")).not.toContain("Blank");
  });

  it("writes a project that installs every @orthograph package at the preset's version", () => {
    const pkg = JSON.parse(tree.read("package.json", "utf8")!) as Record<string, Record<string, string>>;
    expect(pkg["scripts"]!["ortho"]).toBe("ortho");
    expect(pkg["devDependencies"]!["@orthograph/cli"]).toBe("1.2.3");
    expect(pkg["dependencies"]!["@orthograph/host-cloudflare"]).toBe("1.2.3");
    expect(tree.read(".gitignore", "utf8")).toContain(".ortho/");
    expect(pkg["packageManager"]).toBe("pnpm@11.20.0" as never);
    expect(tree.read("pnpm-workspace.yaml", "utf8")).toMatch(/allowBuilds:\n  esbuild: true\n  nx: true\n  workerd: true/);
    expect(typeof install).toBe("function");
  });

  it("merges its pnpm settings into the workspace's own, keeping what Nx wrote", () => {
    const nx = "autoInstallPeers: true\nallowBuilds:\n  nx: true\n  '@orthograph/preset': false\nminimumReleaseAgeExclude:\n  - 'x@1'\n";
    expect(mergeWorkspace(nx, WORKSPACE)).toBe(
      "autoInstallPeers: true\nallowBuilds:\n  nx: true\n  '@orthograph/preset': false\n  esbuild: true\n  workerd: true\nminimumReleaseAgeExclude:\n  - 'x@1'\noverrides:\n  kysely: 0.29.7\n",
    );
    expect(mergeWorkspace(mergeWorkspace(nx, WORKSPACE), WORKSPACE)).toBe(mergeWorkspace(nx, WORKSPACE));
  });

  it("exempts orthograph and @orthograph/* from the minimum release age, each once, keeping what is listed", () => {
    const nx = "minimumReleaseAgeExclude:\n  - 'x@1'\n";
    const once = addToList(nx, "minimumReleaseAgeExclude", AGE_EXEMPT);
    expect(once).toBe("minimumReleaseAgeExclude:\n  - 'x@1'\n  - orthograph\n  - '@orthograph/*'\n");
    expect(addToList(once, "minimumReleaseAgeExclude", AGE_EXEMPT)).toBe(once);
    expect(addToList("minimumReleaseAgeExclude: []\n", "minimumReleaseAgeExclude", AGE_EXEMPT)).toBe("minimumReleaseAgeExclude:\n  - orthograph\n  - '@orthograph/*'\n");
    expect(addToList("", "minimumReleaseAgeExclude", AGE_EXEMPT)).toBe("minimumReleaseAgeExclude:\n  - orthograph\n  - '@orthograph/*'\n");
  });

  describe("addToList, which parses the workspace file", () => {
    const key = "minimumReleaseAgeExclude";
    const listed = (text: string): ReadonlyArray<string> => (parse(text) as Record<string, ReadonlyArray<string>>)[key] ?? [];
    const keys = (text: string) => text.split("\n").filter((l) => l.startsWith(`${key}:`)).length;

    it("adds the key when there is none, keeping the file's other keys", () => {
      const out = addToList("autoInstallPeers: true\n", key, AGE_EXEMPT);
      expect(out).toBe("autoInstallPeers: true\nminimumReleaseAgeExclude:\n  - orthograph\n  - '@orthograph/*'\n");
    });

    it("adds to a block list under `key:`", () => {
      expect(addToList("minimumReleaseAgeExclude:\n  - 'x@1'\nother: 1\n", key, AGE_EXEMPT)).toBe(
        "minimumReleaseAgeExclude:\n  - 'x@1'\n  - orthograph\n  - '@orthograph/*'\nother: 1\n",
      );
      expect(addToList("minimumReleaseAgeExclude:\nother: 1\n", key, AGE_EXEMPT)).toBe(
        "minimumReleaseAgeExclude:\n  - orthograph\n  - '@orthograph/*'\nother: 1\n",
      );
    });

    it("fills `key: []` as a block list", () => {
      expect(addToList("minimumReleaseAgeExclude: []\n", key, AGE_EXEMPT)).toBe("minimumReleaseAgeExclude:\n  - orthograph\n  - '@orthograph/*'\n");
    });

    it("adds to a non-empty inline list under the one key", () => {
      const out = addToList("minimumReleaseAgeExclude: ['nx']\n", key, AGE_EXEMPT);
      expect(keys(out)).toBe(1);
      expect(listed(out)).toEqual(["nx", "orthograph", "@orthograph/*"]);
    });

    it("keeps a trailing comment on the key line, and the file's other comments, under the one key", () => {
      const text = "# pnpm settings\nminimumReleaseAgeExclude: # young on purpose\n  - 'x@1' # its reason\n";
      const out = addToList(text, key, AGE_EXEMPT);
      expect(keys(out)).toBe(1);
      expect(listed(out)).toEqual(["x@1", "orthograph", "@orthograph/*"]);
      for (const c of ["# pnpm settings", "# young on purpose", "# its reason"]) expect(out).toContain(c);
      const inline = addToList("minimumReleaseAgeExclude: ['nx'] # kept\n", key, AGE_EXEMPT);
      expect(keys(inline)).toBe(1);
      expect(inline).toContain("# kept");
    });

    it("adds nothing already listed, however it is quoted", () => {
      const text = "minimumReleaseAgeExclude:\n  - \"@orthograph/*\"\n  - orthograph\n";
      expect(addToList(text, key, AGE_EXEMPT)).toBe(text);
      expect(listed(addToList("minimumReleaseAgeExclude: [orthograph]\n", key, AGE_EXEMPT))).toEqual(["orthograph", "@orthograph/*"]);
    });
  });
});
