// Goal 6, slice 2: the byte-identical check (the core-language rule of the goal's bound, K31 section 1). A blueprint that declares no
// app and no pages generates exactly what it did before the map existed: acme and Plugged In are compiled afresh here, with their
// checked-in `generated/` removed first so nothing is borrowed from it, and every file under `generated/` (the model's `model.json`
// among them) must equal the checked-in one, byte for byte, with no file more and none fewer. The checked-in files are `goal/stage-1`'s.
//
// This is the one check of the map that passes today. It must keep passing with the map modules in, in every slice from 3 on; it
// fails on a changed byte, a new file (an `app/` folder appearing for a project that does not mount it) or a missing one. The control
// below plants each, so a green run means the comparison can see them.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, generated, modelOf, pluggedIn, project, walk, type Project } from "./support.ts";

const live: Array<Project> = [];
const made = (example: string): Project => { const p = project([], example); live.push(p); return p; };
afterAll(() => { for (const p of live.splice(0)) p.remove(); });

/** What is wrong between a project's `generated/` and the checked-in one of its example: files added, files missing, files changed. */
const differences = (p: Project, example: string): ReadonlyArray<string> => {
  const now = new Set(p.files("generated"));
  const kept = new Set(walk(example, "generated"));
  return [
    ...[...now].filter((f) => !kept.has(f)).map((f) => `extra: ${f}`),
    ...[...kept].filter((f) => !now.has(f)).map((f) => `missing: ${f}`),
    ...[...kept].filter((f) => now.has(f) && !readFileSync(join(example, f)).equals(readFileSync(join(p.root, f)))).map((f) => `changed: ${f}`),
  ];
};

describe.each([["plugged-in", pluggedIn], ["acme", acme]] as const)("%s, compiled afresh", (name, example) => {
  it("every file of generated/ equals the checked-in one, byte for byte, and its model has no `app`", () => {
    const p = made(example);
    rmSync(join(p.root, "generated"), { recursive: true });
    generated(p);
    expect(differences(p, example)).toEqual([]);
    expect(Object.keys(modelOf(p))).not.toContain("app");
    expect(p.exists("generated/app")).toBe(false);
    expect(p.files("generated").length, `${name}'s generated files`).toBeGreaterThan(20);
  }, 900_000);
});

describe("the comparison can see what it is for", () => {
  it("reports a missing file, a changed byte and an extra file", () => {
    const p = made(pluggedIn);
    const first = p.files("generated")[0] ?? "";
    expect(differences(p, pluggedIn)).toEqual([]);
    const original = readFileSync(join(p.root, first));
    rmSync(join(p.root, first));
    expect(differences(p, pluggedIn)).toEqual([`missing: ${first}`]);
    writeFileSync(join(p.root, first), Buffer.concat([original, Buffer.from(" ")]));
    expect(differences(p, pluggedIn)).toEqual([`changed: ${first}`]);
    writeFileSync(join(p.root, "generated/app-routes.json"), "{}");
    expect(differences(p, pluggedIn)).toEqual(["extra: generated/app-routes.json", `changed: ${first}`]);
  });
});
