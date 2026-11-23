// Check 44 (M1.51, K28): the npm preview's dry run lists exactly the public packages, refuses any tag but `next` against npmjs, and holds every package to one licence.
// What the command is and how its output reads: `npm-preview.ts`, the top of the file (the seam is the builder's; the PR argues `tools/release/preview.mjs`). The checks read
// that terminal output, run with `deny-network.mjs` loaded and a decoy npm token, and judge it against the manifests and `npm pack --dry-run`, never against itself.
//  (a) THE LIST. Against npmjs the dry run prints one block per package with no `"private": true`, `orthograph` and `@orthograph/preset` among them, each with its manifest's
//      name and version, tag `next`, its `license` field and the tarball's files; no private package, none twice, none missing.
//  (b) THE TAG. Any tag but `next` against npmjs (any spelling of its address) is refused, naming the tag, before a block is printed; with none given the tag is `next`;
//      a registry on this machine takes another tag, so the rule is npmjs's.
//  (c) THE LICENCE (Aaron, 23 November 2026: "Make it all Apache 2.0"). Every published package's `license` is exactly "Apache-2.0": a missing one, an empty one and another
//      one (MIT too) each fail the run, and every such package is named, no other; a private package is not judged. The repository has a root LICENSE with the Apache License 2.0.
//      Red today: no package says Apache-2.0, two say MIT, the rest nothing, and there is no root LICENSE. The list is printed whatever the licence verdicts are.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { repo } from "./support.ts";
import { GOOD, NPMJS, blocks, cleanup, packed, preview, publicOf, shimmed, unlicensed, without, workspace, type Ran, type Spec } from "./npm-preview.ts";

afterAll(cleanup);
const APACHE = "Apache-2.0";
const dry = (root: string, ...more: ReadonlyArray<string>) => preview(["--dry-run", "--root", root, ...more]);
let real: Ran | undefined;
const realRun = () => (real ??= preview(["--dry-run"]));
const lines = (ran: Ran) => ran.all.split("\n").filter((l) => l.trim() !== "").slice(0, 4).join(" | ").slice(0, 300);
const shown = (ran: Ran) => blocks(ran.out);


describe("44 controls: the oracle is real", () => {
  it("the repository's public packages are the manifests without private, with the front door and the preset among them, and not the private ones", () => {
    const names = publicOf(repo).map((m) => m.name);
    expect(names).toContain("orthograph");
    expect(names).toContain("@orthograph/preset");
    expect(names).not.toContain("@orthograph/services");
    expect(names).not.toContain("@orthograph/language-solidity");
    expect(names.length).toBeGreaterThanOrEqual(14);
  });
  it("the fixture workspace has three public packages and one private", () => {
    expect(publicOf(workspace(GOOD)).map((m) => m.name)).toEqual(["@orthograph/alpha", "@orthograph/preset", "orthograph"]);
  });
});

describe("44 (a) the list against npmjs", () => {
  it("the repository: one block per public package, its name, version, tag next, licence field and files; no private package, none twice", () => {
    const ran = realRun();
    const got = shown(ran);
    expect(got.map((b) => b.name).sort(), lines(ran)).toEqual(publicOf(repo).map((m) => m.name).sort());
    for (const m of publicOf(repo)) {
      const b = got.find((x) => x.name === m.name)!;
      expect(b.version, m.name).toBe(m.version);
      expect(b.tag, m.name).toBe("next");
      expect(b.license, m.name).toBe(m.license ?? "none");
      expect(b.count, m.name).toBe(b.files.length);
      expect(b.files, m.name).toContain("package.json");
    }
  });
  it("a fixture workspace: each package's own version, tag next, its licence and files, in a run that succeeds", () => {
    const ran = dry(workspace(GOOD));
    expect(ran.status, lines(ran)).toBe(0);
    const got = shown(ran);
    expect(got.map((b) => `${b.name}@${b.version} ${b.tag} ${b.license}`).sort()).toEqual(["@orthograph/alpha@1.2.3 next Apache-2.0", "@orthograph/preset@0.4.0-next.1 next Apache-2.0", "orthograph@0.3.0 next Apache-2.0"]);
    expect(ran.all).not.toContain("@orthograph/hidden");
    expect(ran.all).not.toContain("9.9.9");
  });
});

describe("44 (a) a package that says `private: false` is public", () => {
  it("is listed with the rest, and `hidden` still is not", () => {
    const ran = dry(workspace([...GOOD, { dir: "explicit", name: "@orthograph/explicit", version: "2.0.0", license: APACHE, private: false }]));
    expect(ran.status, lines(ran)).toBe(0);
    expect(shown(ran).map((b) => b.name).sort()).toEqual(["@orthograph/alpha", "@orthograph/explicit", "@orthograph/preset", "orthograph"]);
  });
});

describe("44 (b) the tag", () => {
  const root = () => workspace(GOOD);
  for (const tag of ["latest", "beta", "Next", "nex", "next ", "rc"]) {
    it(`--tag ${JSON.stringify(tag)} against npmjs is refused, naming it, and lists nothing`, () => {
      const ran = dry(root(), "--registry", NPMJS, "--tag", tag);
      expect(ran.status, lines(ran)).toBe(1);
      expect(ran.all).toContain(`tag "${tag}"`);
      expect(shown(ran)).toEqual([]);
    });
  }
  it("--tag=latest, and npmjs spelled another way, are refused as well", () => {
    for (const args of [["--tag=latest"], ["--registry=https://registry.npmjs.org", "--tag", "latest"], ["--registry", "http://registry.npmjs.org/", "--tag", "latest"], ["--registry", "https://registry.npmjs.org/some/path/", "--tag", "latest"], ["--registry", "https://registry.npmjs.org:443/", "--tag", "latest"], ["--registry", "HTTPS://Registry.NPMJS.org/", "--tag", "latest"]]) {
      const ran = dry(root(), ...args);
      expect(ran.status, `${args.join(" ")}: ${lines(ran)}`).toBe(1);
      expect(ran.all, args.join(" ")).toContain('tag "latest"');
      expect(shown(ran), args.join(" ")).toEqual([]);
    }
  });
  it("--tag next against npmjs, and no tag at all, both say next on every package", () => {
    for (const args of [["--registry", NPMJS, "--tag", "next"], ["--registry", NPMJS], []]) {
      const ran = dry(root(), ...args);
      expect(ran.status, `${args.join(" ")}: ${lines(ran)}`).toBe(0);
      expect(shown(ran).map((b) => b.tag)).toEqual(["next", "next", "next"]);
    }
  });
  it("a registry of this machine takes another tag, and says next when given none: the refusal is npmjs's", () => {
    const ran = dry(root(), "--registry", "http://127.0.0.1:9/", "--tag", "latest");
    expect(ran.status, lines(ran)).toBe(0);
    expect(shown(ran).map((b) => b.tag)).toEqual(["latest", "latest", "latest"]);
    for (const registry of ["http://127.0.0.1:9/", "http://localhost:4873"]) {
      const none = dry(root(), "--registry", registry);
      expect(none.status, lines(none)).toBe(0);
      expect(shown(none).map((b) => b.tag), registry).toEqual(["next", "next", "next"]);
    }
  });
});

describe("44 (c) the licence is Apache-2.0, exactly", () => {
  const bad = (name: string, change: Partial<Spec> | "drop-license") => dry(workspace(without(GOOD, name, change)));
  it("the repository fails, naming each public package whose licence is not Apache-2.0, and no other", () => {
    const ran = realRun();
    const lacking = publicOf(repo).filter((m) => m.license !== APACHE).map((m) => m.name).sort();
    expect(ran.status, lines(ran)).toBe(lacking.length === 0 ? 0 : 1);
    expect([...unlicensed(ran.all)].sort(), lines(ran)).toEqual(lacking);
    expect(ran.all).not.toContain("@orthograph/services");
  });
  it("every package of the fixture says Apache-2.0: the run passes and names no licence refusal", () => {
    const ran = dry(workspace(GOOD));
    expect(ran.status, lines(ran)).toBe(0);
    expect(unlicensed(ran.all)).toEqual([]);
  });
  it("a missing licence, an empty one, MIT and a near miss each fail, naming the package", () => {
    for (const [change, what] of [["drop-license", "missing"], [{ license: "" }, "empty"], [{ license: ["Apache-2.0"] }, "array"], [{ license: { type: "Apache-2.0" } }, "object"], [{ license: null }, "null"], [{ license: 2 }, "number"], [{ license: "MIT" }, "MIT"], [{ license: "Apache-2" }, "near"], [{ license: "apache-2.0" }, "case"], [{ license: "Apache-2.0 " }, "space"]] as const) {
      const ran = bad("@orthograph/alpha", change);
      expect(ran.status, `${what}: ${lines(ran)}`).toBe(1);
      expect(unlicensed(ran.all), what).toEqual(["@orthograph/alpha"]);
    }
  });
  it("two bad packages are both named, and the one that is fine is not", () => {
    const ran = dry(workspace(without(without(GOOD, "orthograph", "drop-license"), "@orthograph/preset", { license: "MIT" })));
    expect(ran.status, lines(ran)).toBe(1);
    expect([...unlicensed(ran.all)].sort()).toEqual(["@orthograph/preset", "orthograph"]);
  });
  it("a private package with a wrong licence is not judged", () => {
    const ran = bad("@orthograph/hidden", { license: "MIT" });
    expect(ran.status, lines(ran)).toBe(0);
    expect(unlicensed(ran.all)).toEqual([]);
  });
  it("a run that fails still prints every block right: the version, tag, licence as it is (`none` when missing) and the files npm would send", () => {
    for (const [change, shows] of [["drop-license", "none"], [{ license: "MIT" }, "MIT"]] as const) {
      const root = workspace(without(GOOD, "orthograph", change));
      const ran = dry(root);
      expect(ran.status, lines(ran)).toBe(1);
      const got = shown(ran);
      expect(got.map((b) => b.name).sort()).toEqual(["@orthograph/alpha", "@orthograph/preset", "orthograph"]);
      for (const m of publicOf(root)) {
        const b = got.find((x) => x.name === m.name)!;
        expect([b.version, b.tag, b.license], m.name).toEqual([m.version, "next", m.name === "orthograph" ? shows : APACHE]);
        expect([...b.files].sort(), m.name).toEqual(packed(m.dir));
        expect(b.count, m.name).toBe(b.files.length);
      }
    }
  });
  it("the repository has a root LICENSE that is the Apache License 2.0", () => {
    const file = join(repo, "LICENSE");
    expect(existsSync(file), "LICENSE at the repository root does not exist yet").toBe(true);
    const text = readFileSync(file, "utf8");
    expect(text).toMatch(/Apache License\s+Version 2\.0, January 2004/);
    expect(text).toContain("TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION");
    expect(text).toContain("END OF TERMS AND CONDITIONS");
    expect(text.length).toBeGreaterThan(10_000);
  });
});

describe("44 last: nothing but Node ran", () => {
  it("no curl, wget, nc, ssh, python or gh was run by any command above", () => { expect(shimmed()).toBe(""); });
});
