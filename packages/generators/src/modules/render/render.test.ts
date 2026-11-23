import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { Render } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const render = (project: Parameters<typeof Render.files>[0]) => Effect.runPromise(Render.files(project));
const files = await render({ name: "acme", model, root: resolve(repo, "examples/acme") });
const byPath = new Map(files.map((f) => [f.path, f]));

describe("render", () => {
  it("writes the four outputs for every operation", () => {
    for (const op of ["allowance/grant", "organization/create"]) {
      for (const p of [`generated/api/src/${op}.ts`, `generated/api/src/${op}.handler.ts`, `generated/sdk/src/${op}.ts`, `generated/cli/src/${op}.ts`]) {
        expect(byPath.has(p), p).toBe(true);
      }
    }
    expect(byPath.has("generated/server/main.ts")).toBe(true);
  });

  it("marks every generated file do-not-edit, and every scaffold with where it came from", () => {
    for (const f of files.filter((f) => !f.scaffold && f.path.endsWith(".ts"))) {
      expect(f.content.split("\n").find((l) => !l.startsWith("#!")), f.path).toMatch(/^\/\/ Generated from .+\. Do not edit\.$/);
    }
    const scaffolds = files.filter((f) => f.scaffold).map((f) => f.path);
    expect(scaffolds).toEqual([
      "src/allowance/grant.ts", "src/allowance/revoke.ts", "src/allowance/spend.ts",
      "src/api-key/create.ts", "src/invitation/accept.ts", "src/invitation/revoke.ts",
      "src/invitation/send.ts", "src/organization/create.ts", "src/person/sign-up.ts",
      "src/session/show.ts", "src/session/sign-in.ts", "src/system/health.ts",
    ]);
    expect(byPath.get(scaffolds[0]!)!.content).toMatch(/^\/\/ Scaffolded from blueprint\/things\/allowance\/verbs\/grant\.ts\. Yours from now on\./);
  });

  it("writes a docs page per thing and operation, each refusal with its exit code, and the model's edges", () => {
    const spend = byPath.get("generated/docs/allowance/spend.md")!.content;
    expect(spend.split("\n")[0]).toBe("<!-- Generated from the blueprint. Do not edit. -->");
    expect(spend).toContain("| AllowanceExceeded | 41 | AL-001 |");
    expect(spend).toContain("| AllowanceNotActive | 40 | AL-900 |");
    expect(spend).toContain("acme allowance spend --allowance <allowance> --amount <amount> --memo <memo>");
    expect(byPath.get("generated/docs/allowance/index.md")!.content).toContain("| spend | active | active, exhausted | AllowanceSpent |");
    const edges = JSON.parse(byPath.get("generated/model/edges.json")!.content) as ReadonlyArray<{ from: string; to: string; kind: string }>;
    expect(edges).toContainEqual({ from: "allowance.organization", to: "organization.id", kind: "refers" });
    expect(edges).toContainEqual({ from: "allowance.spend", to: "allowance.grantee", kind: "allowed-by" });
  });

  it("declares each operation's refusals on its endpoint, with their exit codes", () => {
    expect(byPath.get("generated/api/src/allowance/grant.ts")!.content).toContain("error: [AllowanceLimitTooHigh, PersonNotFound, NotAllowed, IdempotencyConflict]");
    const errors = byPath.get("generated/api/src/errors.ts")!.content;
    // K16 (M1.47): one refusals table holds each exit, beside its code and HTTP status.
    expect(errors).toContain('AllowanceLimitTooHigh: { code: "AL-003", exit: 44, status: 422 },');
    expect(errors).toContain('AllowanceNotActive: { code: "AL-900", exit: 40, status: 409 },');
    expect(errors).toContain('NotAllowed: { code: "AR-001", exit: 3, status: 403 },');
  });

  it("gives every refusal its code beside its tag: on its wire class, in the SDK's codes, and in the CLI's line (L2.P)", () => {
    const errors = byPath.get("generated/api/src/errors.ts")!.content;
    // K16 (M1.47): the class reads its code from the refusals table, which holds it once.
    expect(errors).toContain('AllowanceExceeded: { code: "AL-001", exit: 41, status: 422 },');
    expect(errors).toContain("{ code: Schema.Literal(refusals.AllowanceExceeded.code), ...wireStruct(Allowance.AllowanceExceeded.fields).fields }");
    expect(errors).toContain("static readonly code = refusals.AllowanceExceeded.code;");
    expect(errors).toContain('AllowanceNotActive: { code: "AL-900",');
    expect(errors).toContain('NotAllowed: { code: "AR-001",');
    // What a caller is shown of a refusal is the visibility rule's, not a list in the generated errors.
    expect(errors).not.toContain("shown");
    const output = byPath.get("generated/cli/src/output.ts")!.content;
    expect(output).toContain("`${typeof code === \"string\" ? `[${code}] ` : \"\"}${tag}");
    expect(byPath.get("generated/docs/session/sign-in.md")!.content).toContain("| password | Password (secret) |");
  });

  it("wires an operation's call out in the server, types its handler beside it, and scaffolds the one blank, none of it in a client", async () => {
    const quote = { ...model.operations["system.health"]!, name: "system.quote", verb: "quote", file: "blueprint/things/system/verbs/quote.ts",
      payload: { origin: model.operations["person.sign-up"]!.payload["email"]!, mode: model.operations["person.sign-up"]!.payload["email"]! },
      steps: { price: { name: "system.quote.price", type: "call", call: { mount: "pricing", call: "quote", mode: "promise" as const } } } };
    const calling: Model = {
      ...model,
      operations: { ...model.operations, "system.quote": quote },
      mounts: { pricing: { kind: "adapter", file: "blueprint/adapters/pricing.ts", package: "@fixture/remote", version: "1.0.0", integrity: "sha256-x", chosen: {}, calls: ["quote"], layer: true, hash: "h" } },
    };
    const made = new Map((await render({ name: "acme", model: calling })).map((f) => [f.path, f]));
    const server = made.get("generated/server/main.ts")!.content;
    expect(server).toContain('import pricingQuoteCall from "@fixture/remote/src/calls/quote.js";');
    expect(server).toContain('import { layer as pricingLayer } from "@fixture/remote/src/layer.js";');
    expect(server).toContain("calls: { price: { run: pricingQuoteCall, layer: pricingLayer } }");
    expect(made.get("generated/server/handlers/system/quote.ts")!.content).toContain("{ price: typeof priceCall }");
    const scaffold = made.get("src/system/quote.ts")!.content;
    expect(scaffold.match(/Handlers\.blank\(/g)).toHaveLength(1);
    expect(scaffold).toContain("steps.price([payload.origin, payload.mode], Handlers.blank(");
    expect(scaffold).not.toContain("@fixture/remote");
    for (const [path, file] of made) if (path.startsWith("generated/api/") || path.startsWith("generated/sdk/")) expect(file.content, path).not.toMatch(/@fixture\/remote|\/src\/calls\//);
  });

  it("a verb that is a reserved word (the wallet's import) is exported under its name from a binding of another, in the SDK, the CLI and a scaffold", async () => {
    const grant = model.operations["allowance.grant"]!;
    const renamed = { ...model, operations: { ...model.operations, "allowance.import": { ...grant, name: "allowance.import", verb: "import" } } };
    const made = new Map((await render({ name: "acme", model: renamed, root: resolve(repo, "examples/acme") })).map((f) => [f.path, f]));
    for (const path of ["generated/sdk/src/allowance/import.ts", "generated/cli/src/allowance/import.ts"]) {
      const text = made.get(path)!.content;
      expect(text, path).toContain("export const import_ =");
      expect(text, path).toContain("export { import_ as import };");
      expect(text, path).not.toMatch(/export const import\b/);
    }
    expect(made.get("generated/sdk/src/allowance/index.ts")!.content).toContain('export { import } from "./import.ts";');
    expect(made.get("src/allowance/import.ts")!.content).toContain("export default import_;");
    // A verb that is no reserved word is as it was: no second export line.
    expect(byPath.get("generated/sdk/src/allowance/grant.ts")!.content).not.toContain("export {");
  });

  it("writes what the mounted projections make, and nothing for one that isn't mounted, each first line naming its mount", async () => {
    const acme = resolve(repo, "examples/acme");
    expect(files.find((f) => f.path === "generated/server/main.ts")!.content.split("\n")[0]).toBe("// Generated from blueprint/projections/server.ts. Do not edit.");
    expect(byPath.get("generated/model/model.json")!.content).toContain('"mounts"');
    const onlyApi = await render({ name: "acme", model: { ...model, mounts: { api: model.mounts!["api"]! } }, root: acme });
    expect(onlyApi.some((f) => f.path.startsWith("generated/server/")), "no server mount").toBe(false);
    expect(onlyApi.some((f) => f.path.startsWith("generated/model/")), "no model mount").toBe(false);
    expect(onlyApi.some((f) => f.path === "generated/api/src/index.ts")).toBe(true);
    expect(onlyApi.some((f) => f.path.startsWith("generated/sdk/")), "no sdk mount").toBe(false);
    expect(onlyApi.some((f) => f.path.startsWith("generated/cli/")), "no cli mount").toBe(false);
    expect(onlyApi.some((f) => f.path.startsWith("generated/mcp/")), "no mcp mount").toBe(false);
  });

  it("gives a project that mounts no projection the model, the api and the server as they were, headers and all", async () => {
    const bare = await render({ name: "acme", model: Object.fromEntries(Object.entries(model).filter(([key]) => key !== "mounts")) as Model });
    expect(bare.find((f) => f.path === "generated/server/main.ts")!.content.split("\n")[0]).toBe("// Generated from the blueprint. Do not edit.");
    expect(bare.map((f) => f.path)).toEqual(expect.arrayContaining(["generated/model/model.json", "generated/model/edges.json", "generated/api/src/index.ts"]));
  });

  it("refuses a mounted projection it can't load, naming the mount's file", async () => {
    const failed = await Effect.runPromise(Effect.result(Render.files({ name: "acme", model })));
    expect(failed._tag).toBe("Failure");
    expect(String(failed._tag === "Failure" ? failed.failure.message : "")).toContain("blueprint/projections/");
  });

  it("is deterministic", async () => {
    expect(await render({ name: "acme", model, root: resolve(repo, "examples/acme") })).toEqual(files);
  });
});
