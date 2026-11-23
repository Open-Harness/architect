// Check 05 (M2.04): the slice's done-when for acme (design/milestones.md, M2.04; M2-auth "What each later slice does"): acme's
// environments name no secret, and acme's `generated/` is byte for byte what it was, so checks 12, 14 and 21 stay green with no
// baseline recaptured. Acme mounts no plugin yet (M2.05 does), so no secret of the new kind is declared in it, and the model,
// the portal feed and every generated file must not grow a `secrets` section of their own for it.
//
// These are controls: they pass today and must keep passing. "Before" is `e2e/fixtures/m2/acme/generated-before-m2-04.json`, the
// sha256 of each of the 112 files at the start of the slice, so that a builder who regenerates acme's `generated/` and commits
// the result does not move what it is judged against. If another slice changes acme's `generated/` first, its author recaptures
// the manifest in the pair that does it, not this slice's builder.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, ortho, repo } from "../layer1/support.ts";

const before = (JSON.parse(readFileSync(join(repo, "e2e/fixtures/m2/acme/generated-before-m2-04.json"), "utf8")) as { files: Record<string, string> }).files;
const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const hashes = (root: string): Record<string, string> => Object.fromEntries(
  walk(join(root, "generated")).map((file) => [relative(root, file), createHash("sha256").update(readFileSync(file)).digest("hex")] as const).sort(([a], [b]) => (a < b ? -1 : 1)));

const copies: Array<{ readonly remove: () => void }> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

describe("05 acme is unchanged by secrets by declaration", () => {
  it("acme's environments name no secret: no `secrets`, no declaration, in any of them", () => {
    const folder = join(acme, "blueprint/environments");
    const files = readdirSync(folder).filter((f) => f.endsWith(".ts"));
    expect(files.sort()).toEqual(["local.ts", "production.ts", "staging.ts", "test.ts"]);
    for (const file of files) expect(readFileSync(join(folder, file), "utf8"), file).not.toMatch(/secrets\s*:|Blueprint\.secret|Secrets\.|\bSecret\b/);
    expect(existsSync(join(acme, "blueprint/secrets.ts")), "acme declares none of its own either").toBe(false);
  });

  it("acme's checked-in generated/ is the same files, byte for byte, as when the slice began", () => {
    expect(hashes(acme)).toEqual(before);
  });

  it("`ortho generate` on acme writes those same files again, byte for byte, and `ortho check` passes", () => {
    const copy = copyOf(acme);
    copies.push(copy);
    const made = ortho(copy.root, "generate");
    expect(made.status, `${made.stdout}${made.stderr}`).toBe(0);
    expect(hashes(copy.root)).toEqual(before);
    const checked = ortho(copy.root, "check");
    expect(checked.status, `${checked.stdout}${checked.stderr}`).toBe(0);
  });

  it("acme's model names no secret in any environment, and has no secrets of its own", () => {
    const copy = copyOf(acme);
    copies.push(copy);
    const made = ortho(copy.root, "model", "--json");
    expect(made.status, `${made.stdout}${made.stderr}`).toBe(0);
    const model = JSON.parse(made.stdout) as { secrets?: Record<string, unknown>; environments: Record<string, { secrets?: Record<string, unknown> }> };
    expect(model, "no `secrets` section at all, even an empty one: the bytes of acme's model.json do not move").not.toHaveProperty("secrets");
    for (const [name, environment] of Object.entries(model.environments)) expect(Object.keys(environment.secrets ?? {}), name).toEqual([]);
  });
});
