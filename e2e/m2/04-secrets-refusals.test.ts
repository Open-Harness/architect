// Check 04 (M2.04): the refusals design/frame/secrets.md names. Two exports landing on one name are refused by `ortho check`,
// naming both. `ortho promote` refuses an environment with a missing stored secret, naming it, before it starts anything
// ("`promote` refuses an environment with a missing stored secret, naming it"; promote's own "Refusals first").
//
// Assumptions beyond the documents (the PR body lists them):
//  1. A collision is on the derived name, not on the pair of mount and export: `team-signing` + `secret` and `team` +
//     `signingSecret` are different pairs and one name, TEAM_SIGNING_SECRET. The app's `authSecret` and a plugin mounted as
//     `auth` exporting `secret` are another (the app's own names carry no mount).
//  2. The refusal names the secret and the two places that declare it: a mount file (`blueprint/features/<mount>.ts`) or its
//     package, and `blueprint/secrets.ts` for the app's own.
//  3. In the local pass an environment's values, `production` included, are in `.ortho/environments/<env>/secrets.env`
//     (the cloud pass puts them in the Worker's store): `ortho secrets set <NAME> --env production` writes there and `promote` reads it.
//     A declared `test` value does not count in staging and production ("set by a person, once"; the table in frame/secrets.md).
import { afterEach, describe, expect, it } from "vitest";
import { nothingRunning } from "./support.ts";
import { INVOICE, modelOf, run, secretsApp, withInput, type Copy, type Layout } from "./secrets-support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const fresh = (layout?: Layout) => { const copy = secretsApp(layout); copies.push(copy); return copy; };

const AUTH_AGAIN = `import { Blueprint } from "orthograph";\n\nexport const authSecret = Blueprint.secret.generated({ bytes: 32 });\n`;

describe("04 two exports landing on one name are refused, naming the name and both declarations", () => {
  it("the app's `authSecret` and the auth plugin's `secret` mounted as auth are both AUTH_SECRET", () => {
    const { root } = fresh({ organizations: null, appSecrets: AUTH_AGAIN });
    const said = run(root, "check");
    expect(said.status, said.out).not.toBe(0);
    expect(said.out).toContain("AUTH_SECRET");
    expect(said.out, "names the app's declaration").toContain("blueprint/secrets.ts");
    expect(said.out, "names the plugin's mount").toMatch(/features\/auth\.ts|@fixture\/auth/);
    expect(run(root, "model", "--json").status, "the model is not made from a blueprint that names one secret twice").not.toBe(0);
  });

  it("two mounts of different names that derive the same one: team-signing + secret, and team + signingSecret", () => {
    const { root } = fresh({ auth: "team-signing", organizations: "team" });
    const said = run(root, "check");
    expect(said.status, said.out).not.toBe(0);
    expect(said.out).toContain("TEAM_SIGNING_SECRET");
    expect(said.out, "names the first mount").toMatch(/features\/team-signing\.ts|@fixture\/auth/);
    expect(said.out, "names the second mount").toMatch(/features\/team\.ts|@fixture\/organizations/);
  });

  it("controls: the same declarations without the clash pass check and name each secret once", () => {
    const alone = fresh({ auth: "login", organizations: "team", appSecrets: AUTH_AGAIN });
    expect(run(alone.root, "generate").status).toBe(0);
    const checked = run(alone.root, "check");
    expect(checked.status, checked.out).toBe(0);
    const names = Object.keys(modelOf(alone.root).model.secrets ?? {});
    expect(names.filter((n) => n === "AUTH_SECRET")).toEqual(["AUTH_SECRET"]);
    expect(names).toEqual(expect.arrayContaining(["LOGIN_SECRET", "TEAM_SIGNING_SECRET"]));
    const apart = fresh({ auth: "team-access", organizations: "team" });
    expect(run(apart.root, "generate").status).toBe(0);
    const passed = run(apart.root, "check");
    expect(passed.status, passed.out).toBe(0);
    expect(Object.keys(modelOf(apart.root).model.secrets ?? {})).toEqual(expect.arrayContaining(["TEAM_ACCESS_SECRET", "TEAM_SIGNING_SECRET"]));
  });
});

describe("04 `ortho promote` refuses an environment whose stored secret has no value, naming it, before anything starts", () => {
  const promote = (root: string) => run(root, "promote", "--to", "production");
  const named = (out: string, name: string) => new RegExp(`${name}[^\\n]*(?:missing|not set|no value)|(?:missing|not set|no value)[^\\n]*${name}`).test(out);

  it("names every stored runtime secret with no value, in production; a generated one, and a release or builder one, are not named", () => {
    const { root } = fresh({ appSecrets: INVOICE });
    const said = promote(root);
    expect(said.status, said.out).not.toBe(0);
    for (const name of ["ORGANIZATIONS_SIGNING_KEY", "ORGANIZATIONS_WEBHOOK_SIGNING", "LEDGER_KEY"]) expect(named(said.out, name), `${name} is missing:\n${said.out}`).toBe(true);
    for (const name of ["AUTH_SECRET", "INVOICE_SIGNING", "ORGANIZATIONS_SIGNING_SECRET", "ORGANIZATIONS_RELEASE_SEED", "ORGANIZATIONS_PUBLISH_TOKEN", "ORGANIZATIONS_QUERY_TOKEN"]) {
      expect(named(said.out, name), `${name} is not a missing runtime secret`).toBe(false);
    }
    nothingRunning(root);
  });

  it("a value set for it, in production, is no longer named: the refusal follows the state", () => {
    const { root } = fresh();
    expect(withInput(root, "sk_live_NOT-A-REAL-KEY-1\n", "secrets", "set", "ORGANIZATIONS_SIGNING_KEY", "--env", "production").status).toBe(0);
    const said = promote(root);
    expect(named(said.out, "ORGANIZATIONS_SIGNING_KEY"), said.out).toBe(false);
    expect(named(said.out, "ORGANIZATIONS_WEBHOOK_SIGNING"), "its declared test value does not stand in for one in production").toBe(true);
    expect(said.out).not.toContain("sk_live_NOT-A-REAL-KEY-1");
  });

  it("each target reads its own: a value set for production is not one for staging, and the reverse", () => {
    const { root } = fresh();
    expect(withInput(root, "value-for-production-only\n", "secrets", "set", "ORGANIZATIONS_SIGNING_KEY", "--env", "production").status).toBe(0);
    const staging = run(root, "promote", "--to", "staging");
    expect(named(staging.out, "ORGANIZATIONS_SIGNING_KEY"), `staging has none:\n${staging.out}`).toBe(true);
    const other = fresh();
    expect(withInput(other.root, "value-for-staging-only\n", "secrets", "set", "ORGANIZATIONS_SIGNING_KEY", "--env", "staging").status).toBe(0);
    expect(named(run(other.root, "promote", "--to", "staging").out, "ORGANIZATIONS_SIGNING_KEY"), "staging has its own").toBe(false);
    expect(named(promote(other.root).out, "ORGANIZATIONS_SIGNING_KEY"), "production has none").toBe(true);
  });

  it("a value set in another environment does not count for production", () => {
    const { root } = fresh();
    for (const env of ["local", "staging"]) expect(withInput(root, "value-for-another-environment\n", "secrets", "set", "ORGANIZATIONS_SIGNING_KEY", "--env", env).status).toBe(0);
    expect(named(promote(root).out, "ORGANIZATIONS_SIGNING_KEY")).toBe(true);
  });

  it("an app that mounts no plugin with a stored secret is not refused for one", () => {
    const { root } = fresh({ organizations: null });
    const said = promote(root);
    expect(said.out).not.toMatch(/\bmissing\b[^\n]*secret|secret[^\n]*\bmissing\b/i);
  });
});
