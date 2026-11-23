import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { SecretsCommand } from "./service.ts";

const roots: Array<string> = [];
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });

describe("ortho secrets", () => {
  it("a project with no blueprint is an answer with exit 2, and prints no value", async () => {
    const root = mkdtempSync(join(tmpdir(), "ortho-secrets-cli-"));
    roots.push(root);
    const said = await Effect.runPromise(SecretsCommand.set({ root, env: "local", name: "X", stdin: "sk_live_secret\n" }));
    expect(said.exit).toBe(2);
    expect(`${said.out}${said.err}`).not.toContain("sk_live_secret");
  });
});
