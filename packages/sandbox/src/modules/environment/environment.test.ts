// Journey step: "no credential among the execution variables" (no-credential-among-the-execution-variables): the seven names, each from where it should come.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Environment } from "./service.ts";

const spec = { owner: "coder", tag: "ticket/one", root: "/r/sbx_1", blocked: [] as ReadonlyArray<string> };
const of = (variables: ReadonlyArray<{ name: string; value: string; from?: "source" | "settings" }>, blocked: ReadonlyArray<string> = []) =>
  Effect.runPromise(Effect.result(Environment.of({ ...spec, blocked, variables })));

describe("environment", () => {
  it("is the four built-ins, then each source's, then Settings': seven names, each from where it comes", async () => {
    const result = await of([
      { name: "REGION", value: "eu-west", from: "settings" },
      { name: "GITHUB_NUMBER", value: "12", from: "source" },
      { name: "GITHUB_REPOSITORY", value: "acme/widgets", from: "source" },
    ]);
    expect(result).toMatchObject({ _tag: "Success" });
    const vars = (result as { success: ReadonlyArray<{ name: string; from: string; value: string }> }).success;
    expect(vars.map((v) => [v.name, v.from])).toEqual([
      ["SUPERAGENT_DIR", "built-in"], ["SUPERAGENT_NAME", "built-in"], ["SUPERAGENT_TICKET", "built-in"], ["SUPERAGENT_BLOCKED_COMMANDS", "built-in"],
      ["GITHUB_NUMBER", "source"], ["GITHUB_REPOSITORY", "source"], ["REGION", "settings"],
    ]);
    expect(Object.fromEntries(vars.map((v) => [v.name, v.value]))).toMatchObject({ SUPERAGENT_DIR: "/r/sbx_1", SUPERAGENT_NAME: "coder", SUPERAGENT_TICKET: "ticket/one", SUPERAGENT_BLOCKED_COMMANDS: "" });
  });

  it("lists the blocked programs in SUPERAGENT_BLOCKED_COMMANDS", async () => {
    const result = await of([], ["sudo", "ssh"]);
    expect((result as { success: ReadonlyArray<{ name: string; value: string }> }).success.find((v) => v.name === "SUPERAGENT_BLOCKED_COMMANDS")?.value).toBe("sudo,ssh");
  });

  it("refuses a name that looks like a credential, whatever it is called besides, and says which", async () => {
    for (const name of ["GH_TOKEN", "GITHUB_TOKEN", "API_KEY", "MY_SECRET", "DB_PASSWORD", "PASSWD", "AWS_CREDENTIALS", "AUTHORIZATION", "SSH_AUTH_SOCK"]) {
      expect(await of([{ name, value: "x" }]), name).toMatchObject({ _tag: "Failure", failure: { _tag: "CredentialLikeVariable", variable: name } });
    }
  });

  it("refuses a name that is not an environment name, and a name given twice or that shadows a built-in", async () => {
    for (const name of ["lower", "1ABC", "HAS SPACE", "A".repeat(65), "SUPERAGENT_DIR"]) {
      expect(await of([{ name, value: "x" }]), name).toMatchObject({ _tag: "Failure", failure: { _tag: "BadVariableName", variable: name } });
    }
    expect(await of([{ name: "REGION", value: "a" }, { name: "REGION", value: "b" }])).toMatchObject({ _tag: "Failure", failure: { _tag: "BadVariableName", variable: "REGION" } });
  });

  it("makes a process environment from the variables, the shims first on PATH and nothing of the bridge's own", () => {
    const env = Environment.processEnv([{ name: "REGION", from: "settings", value: "eu" }], { root: "/r/sbx_1", shims: "/s/sbx_1", systemPath: "/usr/bin:/bin" });
    expect(env).toEqual({ REGION: "eu", PATH: "/s/sbx_1:/usr/bin:/bin", HOME: "/r/sbx_1", TMPDIR: "/r/sbx_1/.tmp", LANG: "C.UTF-8" });
  });
});
