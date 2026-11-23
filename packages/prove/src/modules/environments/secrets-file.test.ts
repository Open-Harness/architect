// Codex P1 on #690: `env up` made up a value for every name an environment lists, stored ones included, so `promote`
// saw a credential that no one had set. Only a `generated` secret is made; a stored one stays absent until `ortho secrets set`.
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureSecrets, generatedNames } from "./internal/secrets.ts";

const dirs: Array<string> = [];
const fileIn = () => { const d = mkdtempSync(join(tmpdir(), "ortho-env-secrets-")); dirs.push(d); return join(d, "secrets.env"); };
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const valuesOf = (file: string) => new Map(readFileSync(file, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)] as const));
const environment = { AUTH_SECRET: "generated", INVOICE_SIGNING: "generated", STRIPE_API_KEY: "stored" } as const;

describe("what an environment's start makes up", () => {
  it("makes a value for AUTH_SECRET and each generated secret, and none for a stored one", () => {
    const file = fileIn();
    ensureSecrets(file, generatedNames(environment));
    const values = valuesOf(file);
    expect([...values.keys()].sort()).toEqual(["AUTH_SECRET", "INVOICE_SIGNING"]);
    expect(values.get("INVOICE_SIGNING")!.length).toBeGreaterThanOrEqual(32);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("keeps a value that is there, a stored one a person set included, and replaces an empty generated one", () => {
    const file = fileIn();
    writeFileSync(file, "AUTH_SECRET=kept-auth\nSTRIPE_API_KEY=sk_set_by_a_person\nINVOICE_SIGNING=\n", { mode: 0o600 });
    ensureSecrets(file, generatedNames(environment));
    const values = valuesOf(file);
    expect(values.get("AUTH_SECRET")).toBe("kept-auth");
    expect(values.get("STRIPE_API_KEY")).toBe("sk_set_by_a_person");
    expect(values.get("INVOICE_SIGNING")!.length).toBeGreaterThanOrEqual(32);
  });
});
