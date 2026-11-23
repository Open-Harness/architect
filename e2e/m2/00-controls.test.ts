// Check 00 (M2.02): what the later M2 checks stand on works today. The two stand-in plugins are real packed packages, the
// fixture app mounts both and checks, generates and models, and the model carries every operation the plugins declare,
// each from its own mount. These are controls: they pass today and keep passing.
import { afterEach, describe, expect, it } from "vitest";
import { app, run, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const fresh = (variant?: string) => { const copy = app(variant); copies.push(copy); return copy; };

const authOperations = ["person.sign-up", "session.sign-in", "session.show"];
const organizationOperations = ["organization.create", "organization.get", "membership.get", "invitation.send", "invitation.accept", "invitation.revoke", "api-key.create"];

describe("00 the fixture app", () => {
  it("mounts both plugins and passes `ortho check`", () => {
    const { root } = fresh();
    expect(run(root, "generate").status).toBe(0);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
  });

  it("the model carries each plugin's operations, from its own mount, and organizations records that it needs auth", () => {
    const { root } = fresh();
    const made = run(root, "model", "--json");
    expect(made.status, made.out).toBe(0);
    const model = JSON.parse(made.stdout) as { operations: Record<string, { from: { kind: string; mount?: string } }>; mounts: Record<string, { needs?: ReadonlyArray<string> }> };
    for (const name of authOperations) expect(model.operations[name]?.from, name).toMatchObject({ kind: "feature", mount: "auth" });
    for (const name of organizationOperations) expect(model.operations[name]?.from, name).toMatchObject({ kind: "feature", mount: "organizations" });
    expect(model.mounts["organizations"]?.needs).toEqual(["feature:auth"]);
    expect(model.mounts["auth"]?.needs ?? []).toEqual([]);
    // Acme's own copies are not in the fixture app: the plugins are the only owners.
    expect(Object.keys(model.operations).filter((n) => !authOperations.includes(n) && !organizationOperations.includes(n) && !n.startsWith("system."))).toEqual([]);
  });

  it("the plugins' journeys are carried into the model by their mounts: five, each from its own plugin", () => {
    const { root } = fresh();
    const model = JSON.parse(run(root, "model", "--json").stdout) as { journeys?: Record<string, { name: string }> };
    expect(Object.entries(model.journeys ?? {}).map(([file, j]) => `${file.split("/blueprint")[0]}: ${j.name}`).sort()).toEqual([
      "@fixture/auth: sign up and sign in",
      "@fixture/organizations: an invitation is used once",
      "@fixture/organizations: an outsider cannot revoke an invitation",
      "@fixture/organizations: an owner makes an api key",
      "@fixture/organizations: invite and accept",
    ]);
  });

  it("generates", () => {
    const { root } = fresh();
    const made = run(root, "generate");
    expect(made.status, made.out).toBe(0);
  });
});
