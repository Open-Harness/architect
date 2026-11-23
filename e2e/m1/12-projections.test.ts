// Check 12 (M1.11): projections as plugins, part one. The model, the api and the server are mounted by acme, one file each in
// `blueprint/projections/`, from `@orthograph/projections`; `ortho generate` then writes `generated/server` exactly as it did
// when a fixed list of renderers wrote it, and the model records the mounts.
//
// Assumptions beyond M1-plugins (sections 1, 2, 3, 15), design/history/retired-2026-11-23/frame/projections.md (sections 1 and 2) and milestones M1.11 ("acme
// mounts them; its `generated/server` is unchanged", risk 2: "only header paths may differ"), where the design is silent:
//  1. The package is `@orthograph/projections` (M1-plugins section 15, X-10), a dependency of acme (`workspace:*`, as acme's
//     other workspace packages are), and its root export has one named projection descriptor per mount: `model`, `api` and
//     `server`. Each is `Blueprint.projection(...)`'s frozen object: `kind: "projection"` and a `render` function.
//  2. Acme mounts them as `blueprint/projections/{model,api,server}.ts`, each the one line of section 3,
//     `export default Blueprint.use(<name>, (p) => [...])`, with no verb needed. The mount's name is its file's name and its
//     folder follows (`generated/model/`, `generated/api/`, `generated/server/`; design/history/retired-2026-11-23/frame/projections.md section 2), so the
//     model projection writes `generated/model/`, as the fixed list did.
//  3. "Unchanged" means every file of `generated/server/` and `generated/api/` byte for byte, with one allowance: the first
//     line may say `// Generated from the blueprint. Do not edit.` (as today) or `// Generated from
//     blueprint/projections/<name>.ts. Do not edit.` (the mount that made it), and no other line may differ. The model
//     (`generated/model/model.json`) is the same except for its new `mounts` key. The baseline is recorded in
//     `e2e/fixtures/m1/projections/acme-baseline.json` from acme's checked-in `generated/` at m1 cccc2aab (33 files).
//  4. The model records each mount as `mounts.<name>` with `kind: "projection"`, `file` and `package`, and a `hash` (the same
//     keys as a feature's, assumption 2 of README.md; `version` and `integrity` are not judged, because a workspace link has
//     no registry release to take them from).
//  5. A mount is what makes the output: with no `blueprint/projections/server.ts`, `ortho generate` writes no
//     `generated/server/` (the fixed list is gone, M0.03 "projections are mounted instead"), while the api, which is mounted
//     by its own file, is still written. Part two (sdk, cli, mcp) and three (docs, portal) are not judged here.
//  6. `ortho check` passes on acme after `ortho generate` with the three mounts.
//
// The tripwire fails and never skips: today it names `@orthograph/projections` and the three mount files. The two controls
// pass today and keep passing: acme's checked-in files are the baseline, and the comparison sees a changed byte.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, removeAt, run, succeeds } from "./support.ts";
import { baseline, differences, digestOf, headerless, HEADER, modelDigest } from "./projections.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const fresh = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return copy.root;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const mounted = ["model", "api", "server"] as const;
const mountPath = (name: string) => `blueprint/projections/${name}.ts`;

describe("12 the surface: what acme needs to mount its projections", () => {
  it("has @orthograph/projections with model, api and server as projections, and acme's three mount files", () => {
    const missing: Array<string> = [];
    const installed = existsSync(join(acme, "node_modules/@orthograph/projections/package.json"));
    if (!installed) missing.push("@orthograph/projections, as a dependency of examples/acme (M1-plugins section 15, X-10)");
    if (installed) {
      const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
        `const m = await import("@orthograph/projections"); console.log(JSON.stringify(${JSON.stringify(mounted)}.map((k) => [k, m[k]?.kind, typeof m[k]?.render])));`],
      { cwd: acme, encoding: "utf8" });
      const found = probe.status === 0 ? (JSON.parse(probe.stdout.trim().split("\n").at(-1) ?? "[]") as Array<[string, unknown, unknown]>) : [];
      for (const name of mounted) {
        if (!found.some(([key, kind, render]) => key === name && kind === "projection" && render === "function")) missing.push(`the export \`${name}\` of @orthograph/projections, a projection with a render`);
      }
    }
    for (const name of mounted) if (!existsSync(join(acme, mountPath(name)))) missing.push(`examples/acme/${mountPath(name)}`);
    expect(missing, `acme cannot mount its projections until: ${missing.join("; ")}. This is a tripwire: it fails, it never skips.`).toEqual([]);
  });
});

describe("12 controls: the baseline and the instrument", () => {
  it("acme's checked-in generated/server, generated/api and model are what the baseline records", () => {
    const want = baseline();
    const got = { ...digestOf(acme, "server"), ...digestOf(acme, "api") };
    expect(Object.keys(want.files).length, "the baseline lists the 33 files of server and api").toBe(33);
    expect(differences(want.files, got)).toEqual([]);
    expect(modelDigest(acme)).toBe(want.model);
  });

  it("the comparison sees a changed byte, an extra file and a missing one, but not a different header line", () => {
    const root = fresh();
    const server = Object.fromEntries(Object.entries(baseline().files).filter(([path]) => path.startsWith("server/")));
    const main = join(root, "generated/server/main.ts");
    const original = readFileSync(main, "utf8");
    expect(original.split("\n")[0]).toMatch(HEADER);
    expect(headerless("// Generated from the blueprint. Do not edit.\nx")).toBe(headerless("// Generated from blueprint/projections/api.ts. Do not edit.\nx"));
    writeFileSync(main, original.replace(/^[^\n]*/, "// Generated from blueprint/projections/server.ts. Do not edit."));
    expect(differences(server, digestOf(root, "server")), "a header naming the mount is allowed").toEqual([]);
    writeFileSync(main, original.replace("The Worker", "A Worker"));
    expect(differences(server, digestOf(root, "server"))).toEqual(["changed server/main.ts"]);
    writeFileSync(join(root, "generated/server/extra.txt"), "x");
    removeAt(root, "generated/server/wrangler.jsonc");
    expect(differences(server, digestOf(root, "server"))).toEqual(["changed server/main.ts", "extra server/extra.txt", "missing server/wrangler.jsonc"]);
  });
});

describe("12 M1.11: acme mounts the model, the api and the server", () => {
  it("mounts each from @orthograph/projections in its own file, and depends on the package", () => {
    const pkg = JSON.parse(readFileSync(join(acme, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@orthograph/projections"], "acme's package.json").toBe("workspace:*");
    for (const name of mounted) {
      const file = join(acme, mountPath(name));
      expect(existsSync(file), `examples/acme/${mountPath(name)} is missing`).toBe(true);
      const text = readFileSync(file, "utf8");
      expect(text, mountPath(name)).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "@orthograph/projections"`));
      expect(text, mountPath(name)).toMatch(new RegExp(`export default Blueprint\\.use\\(${name}\\b`));
    }
  });

  it("generates generated/server and generated/api as before, the model as before plus its mounts, and check passes", () => {
    const root = fresh();
    for (const name of mounted) expect(existsSync(join(root, mountPath(name))), `${mountPath(name)} is not in the project`).toBe(true);
    removeAt(root, "generated/server");
    removeAt(root, "generated/api");
    removeAt(root, "generated/model");
    succeeds(root, "generate");
    const want = baseline();
    const got = { ...digestOf(root, "server"), ...digestOf(root, "api") };
    expect(differences(want.files, got), "each file of server and api, byte for byte, its first line aside").toEqual([]);
    expect(modelDigest(root)).toBe(want.model);
    expect(readFileSync(join(root, "generated/server/main.ts"), "utf8").split("\n")[0], "its header may name the mount, nothing else").toMatch(HEADER);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
  });

  it("records the three mounts in the model as projections, with their file and package", () => {
    const root = fresh();
    succeeds(root, "generate");
    const model = JSON.parse(succeeds(root, "model", "--json").stdout) as { mounts?: Record<string, { kind: string; file: string; package: string; hash: string }> };
    for (const name of mounted) {
      expect(model.mounts?.[name], `mounts.${name}`).toMatchObject({ kind: "projection", file: mountPath(name), package: "@orthograph/projections" });
      expect(model.mounts?.[name]?.hash, `mounts.${name}.hash`).toEqual(expect.any(String));
    }
    // Part two (check 14, M1.12) mounts the sdk, cli and mcp beside these: they are allowed here, nothing else is.
    const partTwo = ["sdk", "cli", "mcp"];
    expect(Object.keys(model.mounts ?? {}).filter((name) => !mounted.includes(name as typeof mounted[number]) && !partTwo.includes(name)), "nothing else is mounted yet").toEqual([]);
  });

  it("writes no generated/server when its mount is removed, and still writes the api", () => {
    const root = fresh();
    for (const name of mounted) expect(existsSync(join(root, mountPath(name))), `${mountPath(name)} is not in the project`).toBe(true);
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/server/main.ts")), "generated with the server mounted").toBe(true);
    removeAt(root, mountPath("server"));
    removeAt(root, "generated/server");
    removeAt(root, "generated/api");
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/server")), "nothing mounts the server, so nothing writes it").toBe(false);
    expect(existsSync(join(root, "generated/api/src/index.ts")), "the api is mounted by its own file").toBe(true);
  });
});
