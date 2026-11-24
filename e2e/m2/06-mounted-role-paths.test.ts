// Check 06: a plugin's role path is walked by the plugin's own names, whatever the app mounts it as (#767, found on #939).
// A mount renames a plugin's things to `<mount>-<name>`, but `owner.of("<path>")` is still written in the plugin's names:
// @fixture/organizations's `membership.get` allows `owner.of("membership.organization")`, and the runtime admits the owner
// of the membership's organization under any mount. So `check` keeps that path when the plugin is mounted as `orgs`, and
// still refuses a mounted path that walks to nothing.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { run, secretsApp, type Copy } from "./secrets-support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const mountedAs = (organizations: string) => { const copy = secretsApp({ organizations }); copies.push(copy); return copy.root; };

/** The installed plugin's `membership.get`, as `ortho check` reads it from node_modules. */
const membershipGet = (root: string) => join(root, "node_modules/@fixture/organizations/dist/blueprint/things/membership/verbs/get.js");

describe("06 a mounted plugin's role path is walked by the plugin's own names", () => {
  it("keeps membership.get's `owner.of(\"membership.organization\")` with the plugin mounted as orgs", () => {
    const root = mountedAs("orgs");
    expect(readFileSync(membershipGet(root), "utf8"), "the fixture moved").toContain(`owner.of("membership.organization")`);
    const generated = run(root, "generate");
    expect(generated.out, "no problem names the plugin's role path").not.toContain("membership.organization");
    expect(generated.status, generated.out).toBe(0);
    const checked = run(root, "check");
    expect(checked.out, "no problem names the plugin's role path").not.toContain("membership.organization");
    expect(checked.status, checked.out).toBe(0);
  });

  it("still refuses a mounted plugin's role path that walks to nothing, naming it", () => {
    const root = mountedAs("orgs");
    const file = membershipGet(root);
    const text = readFileSync(file, "utf8");
    expect(text, "the fixture moved").toContain(`owner.of("membership.organization")`);
    writeFileSync(file, text.replace(`owner.of("membership.organization")`, `owner.of("membership.organizaton")`));
    // The model alone, so a drift in files never generated can't stand in for the refusal.
    const said = run(root, "model", "--json");
    expect(said.status, said.out).not.toBe(0);
    expect(said.out).toContain("membership.organizaton");
  });
});
