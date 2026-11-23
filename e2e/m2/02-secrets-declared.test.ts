// Check 02 (M2.04, secrets by declaration): a plugin or the app declares a secret in its own `blueprint/secrets.ts`, and its
// name in every environment is derived from the mount and the export, never typed (`design/frame/secrets.md:78-81`;
// `design/decisions/M2-auth.md`, smaller calls, row 7).
//
// Assumptions beyond those documents (the PR body lists them as open questions for the lead):
//  1. The model carries the declared secrets as `model.secrets`, keyed by name: `{ how, kind, export, from }`, `from` as every
//     other thing of the model says where it came from (`{ kind: "feature", mount }` or `{ kind: "app" }`). `how` is
//     `generated` or `stored`; `kind` is `runtime` (the default), `release` or `builder` (frame/secrets.md, "Three kinds").
//  2. `model.environments.<env>.secrets` (name to `how`, as it is today) holds every runtime secret of the mounts, in every
//     environment, and nothing else: a release or builder secret never reaches a running place.
//  3. The name is the mount, then the export, each in UPPER_SNAKE (`stripe-eu` and `apiKey` give STRIPE_EU_API_KEY); the app's own
//     secrets have no mount in their name (frame/secrets.md:78-81).
//  4. `Secret.release` and `Secret.builder` are exported by `orthograph` beside `Blueprint` (frame/secrets.md uses `Secret.release`).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { INVOICE, NAMES, RUNTIME, modelOf, projectFiles, run, secretsApp, type Copy, type Layout } from "./secrets-support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const fresh = (layout?: Layout) => { const copy = secretsApp(layout); copies.push(copy); return copy; };

const everything = [...NAMES.auth, ...NAMES.organizations, ...NAMES.app];

describe("02 a secret is declared by export, in the plugin's or the app's own blueprint/secrets.ts", () => {
  it("every declaration is in the model, with how it gets its value and which kind it is", () => {
    const { model } = modelOf(fresh({ appSecrets: INVOICE }).root);
    expect(Object.keys(model.secrets ?? {}).sort(), "exactly the declared secrets: no built-in one, none missing").toEqual([...everything].sort());
    const secrets = model.secrets ?? {};
    expect(secrets["AUTH_SECRET"]).toMatchObject({ how: "generated", kind: "runtime", export: "secret", from: { kind: "feature", mount: "auth" } });
    expect(secrets["ORGANIZATIONS_WEBHOOK_SIGNING"]).toMatchObject({ how: "stored", kind: "runtime", export: "webhookSigning", from: { kind: "feature", mount: "organizations" } });
    expect(secrets["ORGANIZATIONS_SIGNING_KEY"]).toMatchObject({ how: "stored", kind: "runtime", export: "signingKey" });
    expect(secrets["ORGANIZATIONS_SIGNING_SECRET"]).toMatchObject({ how: "generated", kind: "runtime", export: "signingSecret" });
    expect(secrets["ORGANIZATIONS_PUBLISH_TOKEN"]).toMatchObject({ how: "stored", kind: "release", export: "publishToken" });
    expect(secrets["ORGANIZATIONS_RELEASE_SEED"], "a kind is not decided by how the value is given").toMatchObject({ how: "generated", kind: "release", export: "releaseSeed" });
    expect(secrets["LEDGER_KEY"]).toMatchObject({ how: "stored", kind: "runtime", export: "ledgerKey", from: { kind: "app" } });
    expect(secrets["ORGANIZATIONS_QUERY_TOKEN"]).toMatchObject({ how: "stored", kind: "builder", export: "queryToken" });
    expect(secrets["INVOICE_SIGNING"]).toMatchObject({ how: "generated", kind: "runtime", export: "invoiceSigning", from: { kind: "app" } });
  });

  it("the model holds names and how each gets its value, never a value (D3 #22): not even a declared test value", () => {
    const { text } = modelOf(fresh({ appSecrets: INVOICE }).root);
    expect(text).not.toContain("whsec_fixture_test_value");
  });

  it("the project passes `ortho check` and generates with its secrets declared", () => {
    const { root } = fresh({ appSecrets: INVOICE });
    for (const command of ["generate", "check"]) {
      const said = run(root, command);
      expect(said.status, `ortho ${command}:\n${said.out}`).toBe(0);
    }
  });

  it("an app with no declaration of its own, and plugins that declare none, has no secrets in its model", () => {
    const { model } = modelOf(fresh({ auth: null, organizations: null }).root);
    expect(Object.keys(model.secrets ?? {})).toEqual([]);
  });
});

describe("02 the name comes from the mount and the export", () => {
  it("`secret` of the plugin mounted as features/auth.ts is AUTH_SECRET; mounted as features/identity.ts it is IDENTITY_SECRET", () => {
    const { model } = modelOf(fresh({ auth: "identity", organizations: null }).root);
    expect(Object.keys(model.secrets ?? {})).toEqual(["IDENTITY_SECRET"]);
    expect(model.secrets?.["IDENTITY_SECRET"]).toMatchObject({ how: "generated", export: "secret", from: { kind: "feature", mount: "identity" } });
  });

  it("a mount of dashed words and an export in camelCase are each joined in UPPER_SNAKE: team-members and webhookSigning", () => {
    const { model } = modelOf(fresh({ organizations: "team-members" }).root);
    const names = Object.keys(model.secrets ?? {});
    expect(names).toContain("TEAM_MEMBERS_WEBHOOK_SIGNING");
    expect(names).toContain("TEAM_MEMBERS_SIGNING_KEY");
    expect(names.filter((n) => n.startsWith("ORGANIZATIONS_")), "the old mount's name is gone").toEqual([]);
    expect(names.filter((n) => n.startsWith("TEAM_MEMBERS_")).sort()).toEqual(NAMES.organizations.map((n) => n.replace("ORGANIZATIONS_", "TEAM_MEMBERS_")).sort());
  });

  it("the app's own secrets have no mount in their names: invoiceSigning is INVOICE_SIGNING, ledgerKey is LEDGER_KEY", () => {
    const { model } = modelOf(fresh({ auth: null, organizations: null, appSecrets: INVOICE }).root);
    expect(Object.keys(model.secrets ?? {}).sort()).toEqual(["INVOICE_SIGNING", "LEDGER_KEY"]);
  });

  it("any mount name works the same: names are derived, not looked up (door + crew-room, then gate + staff)", () => {
    for (const [auth, organizations, prefix, other] of [["door", "crew-room", "DOOR", "CREW_ROOM"], ["gate", "staff", "GATE", "STAFF"]] as const) {
      const names = Object.keys(modelOf(fresh({ auth, organizations }).root).model.secrets ?? {}).sort();
      expect(names, `${auth} and ${organizations}`).toEqual([`${prefix}_SECRET`, ...NAMES.organizations.map((n) => n.replace("ORGANIZATIONS_", `${other}_`))].sort());
    }
  });

  it("unmounting a plugin removes its secrets, and mounting adds them: nothing of the other plugin changes", () => {
    const both = Object.keys(modelOf(fresh().root).model.secrets ?? {}).sort();
    const authOnly = Object.keys(modelOf(fresh({ organizations: null }).root).model.secrets ?? {}).sort();
    expect(both).toEqual([...NAMES.auth, ...NAMES.organizations].sort());
    expect(authOnly).toEqual([...NAMES.auth]);
  });
});

describe("02 every environment gets every runtime secret of the mounts, and only those", () => {
  it("each environment names the runtime secrets, with how each is given, the same as the model's; none names a release or a builder secret", () => {
    const { model } = modelOf(fresh({ appSecrets: INVOICE, extraEnvironment: "preview" }).root);
    const environments = Object.entries(model.environments ?? {});
    expect(environments.map(([name]) => name).sort(), "the fixture's four and the one added").toEqual(["local", "preview", "production", "staging", "test"]);
    for (const [name, environment] of environments) {
      const secrets = environment.secrets ?? {};
      expect(Object.keys(secrets).sort(), `environment ${name}`).toEqual([...RUNTIME].sort());
      for (const [secret, how] of Object.entries(secrets)) expect(how, `${name} ${secret}`).toBe(model.secrets?.[secret]?.how);
    }
  });

  it("no environment of the fixture app writes a secret's name: they come from the mounts (the files are the stand-ins' own)", () => {
    const { root } = fresh({ appSecrets: INVOICE });
    for (const env of ["local", "test", "staging", "production"]) {
      const source = readFileSync(join(root, `blueprint/environments/${env}.ts`), "utf8");
      expect(source, env).not.toMatch(/secrets\s*:|Blueprint\.secret|Secrets\./);
    }
  });
});

describe("02 a declared name is never written as a string outside generated/", () => {
  it("no file of the project, its plugins' sources and the app's, names a derived name, and generated/ does", () => {
    const { root } = fresh({ appSecrets: INVOICE });
    expect(run(root, "generate").status).toBe(0);
    const mentions = (path: string, name: string) => readFileSync(path, "utf8").includes(name);
    const outside = [...projectFiles(root, ["node_modules", ".ortho", "generated"]), ...projectFiles(join(root, "node_modules/@fixture"), [])];
    const strings = outside;
    for (const name of everything) {
      expect(strings.filter((file) => mentions(file, name)), `${name} is written by hand in`).toEqual([]);
    }
    const generated = projectFiles(join(root, "generated"), []).filter((file) => /\.(ts|json)$/.test(file));
    for (const name of everything) expect(generated.some((file) => mentions(file, name)), `${name} is in no generated file`).toBe(true);
  });
});
