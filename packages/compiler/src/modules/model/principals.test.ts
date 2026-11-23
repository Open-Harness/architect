// M2.03 in the model (M2-auth, fork 2): an entry that `.via` or `.notVia` narrowed says the ways in it keeps, sorted; every operation says whether an agent is
// shown it as a tool; `issues` is an environment's own, and it needs no `identity`.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-principals");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

const copyOfAcme = (): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "acme-"));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && basename(path) !== "projections" });
  return root;
};

const problemsOf = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");

describe("principals in the model", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("keeps the ways in a narrowed entry names, sorted, and says agentTool on every operation", async () => {
    const exit = await modelOf(copyOfAcme());
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    const operations = exit.value.operations;
    expect(operations["api-key.create"]?.allowed).toEqual([{ kind: "role-of", role: "organization.owner", path: "organization", via: ["device", "session"] }]);
    expect(operations["invitation.accept"]?.allowed).toEqual([{ kind: "role", role: "invitation.invitee", via: ["device", "key", "session"] }]);
    expect(operations["invitation.send"]?.allowed[0]).not.toHaveProperty("via");
    expect(Object.entries(operations).map(([name, op]) => [name, op.agentTool]).filter(([, tool]) => tool === false)).toEqual([["api-key.create", false], ["invitation.accept", false]]);
    expect(operations["organization.create"]?.agentTool).toBe(true);
  });

  it("refuses an entry narrowed to no way in, naming the file", async () => {
    const root = copyOfAcme();
    const file = join(root, "blueprint/things/invitation/verbs/accept.ts");
    writeFileSync(file, readFileSync(file, "utf8").replace("invitee.notVia(Via.agent)", "invitee.via()"));
    expect(problemsOf(await modelOf(root))).toContain("accept.ts: .via(...) names no way in");
  });

  it("an environment says the ways in it issues, sorted, and needs no identity", async () => {
    const root = copyOfAcme();
    writeFileSync(join(root, "blueprint/environments/local.ts"), `import { Blueprint, Cloud, Via } from "orthograph";\nexport default Blueprint.environment({ runs: "on this machine", issues: [Via.session, Via.agent], database: Cloud.d1.local() });\n`);
    const exit = await modelOf(root);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    const local = exit.value.environments?.["local"];
    expect(local?.issues).toEqual(["agent", "session"]);
    expect(local).not.toHaveProperty("identity");
  });
});
