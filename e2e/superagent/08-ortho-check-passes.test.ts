// Check 08 (Goal 17 slice 5): `ortho check` passes on examples/superagent, with its checked-in `generated/` in place.
// A copy of the example outside the repository, wired to the repository's packages as the layer checks wire acme,
// so a fix to the example can't hide in a cache. Slice 5's done-when, first clause (17-superagent.md, "The slices").
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appExists, check, copyApp, filesUnder, removeCopies, superagent } from "./app.ts";

afterEach(removeCopies);

describe("08 ortho check passes on examples/superagent", () => {
  it("the example is there: a blueprint, its generated/ checked in, and its plugins", () => {
    appExists();
    expect(existsSync(join(superagent, "generated/model/model.json")), "examples/superagent/generated/ is not checked in: run `ortho generate`").toBe(true);
    const missing = ["superagent", "intake", "tickets", "prompts"].filter((p) => !existsSync(join(superagent, "plugins", p, "package.json")));
    expect(missing, "plugins the brief's folder tree puts in examples/superagent/plugins/").toEqual([]);
  });

  it("`ortho check` exits 0 and says each of its stages passed: types, rules, drift, and the whole", () => {
    const root = copyApp(["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]);
    expect(filesUnder(root, "generated").length, "the copy has the example's generated files").toBeGreaterThan(0);
    const r = check(root);
    expect(r.status, `ortho check on examples/superagent:\n${r.out}`).toBe(0);
    for (const stage of ["types ✔", "rules ✔", "drift ✔", "check ✔"]) expect(r.stdout, `no "${stage}" line`).toContain(stage);
  });
});
