// L2.10a: the wire projection of acme is deterministic and decodes; the portal's JSON-only dependency adapter is the compiler's
// `Compare.dependsOn` on current and historical models; and the portal stays out of the project's own code (F1 §5).
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Compare, type Model } from "@orthograph/compiler";
import { Wire } from "@orthograph/portal";
import { Render } from "#modules/render/service.js";

const repo = resolve(import.meta.dirname, "../../../../..");
const compiler = resolve(repo, "packages/compiler/src/main.ts");
const compile = (root: string) => JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as Model;
const acme = resolve(repo, "examples/acme");
const read = (path: string) => readFileSync(join(repo, path), "utf8");
const filesOf = async (name: string, model: Model) => new Map((await Effect.runPromise(Render.files({ name, model, root: acme }))).map((f) => [f.path, f.content]));

describe("generated/portal", async () => {
  const model = JSON.parse(read("examples/acme/generated/model/model.json")) as Model;
  const files = await filesOf("acme", model);

  it("is the same bytes every time, and the bytes acme has committed", async () => {
    expect((await filesOf("acme", model)).get("generated/portal/blueprint.json")).toBe(files.get("generated/portal/blueprint.json"));
    expect(files.get("generated/portal/blueprint.json")).toBe(read("examples/acme/generated/portal/blueprint.json"));
    expect(files.get("generated/portal/main.ts")).toBe(read("examples/acme/generated/portal/main.ts"));
  });

  it("decodes, is version 1, and carries the model, every generated doc and no clock", async () => {
    const wire = await Effect.runPromise(Wire.decode(JSON.parse(files.get("generated/portal/blueprint.json")!)));
    expect(wire).toMatchObject({ schemaVersion: 1, project: "acme", revision: null });
    expect(Object.keys(wire.model.operations)).toEqual(Object.keys(model.operations));
    const docs = Object.keys(wire.docs).sort();
    expect(docs).toEqual([...files.keys()].filter((p) => p.startsWith("generated/docs/")).map((p) => p.slice("generated/docs/".length)).sort());
    expect(wire.docs["allowance/spend.md"]).toBe(files.get("generated/docs/allowance/spend.md"));
    expect(files.get("generated/portal/blueprint.json")).not.toMatch(/\d{4}-\d\d-\d\dT\d\d:/);
  });

  it("opens its TypeScript with the generated line, and is the only generated file but the Worker that imports the portal", () => {
    expect(files.get("generated/portal/main.ts")!.split("\n")[0]).toBe("// Generated from the blueprint. Do not edit.");
    const importing = [...files].filter(([path, text]) => path.endsWith(".ts") && text.includes("@orthograph/portal")).map(([path]) => path).sort();
    expect(importing).toEqual(["generated/portal/main.ts"]);
    expect(files.get("generated/server/main.ts")).toContain(`import * as portal from "../portal/main.ts"`);
    expect(files.get("generated/server/main.ts")).toContain("portal.serve(request, env)");
  });
});

describe("the portal's dependency adapter is the compiler's Compare.dependsOn", () => {
  const scratch = join(acme, "test/tmp/portal-conformance");
  const withList = () => {
    rmSync(scratch, { recursive: true, force: true });
    mkdirSync(scratch, { recursive: true });
    for (const part of ["blueprint", "package.json"]) cpSync(join(acme, part), join(scratch, part), { recursive: true, filter: (f) => !basename(f).startsWith(".") });
    writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify({ extends: relative(scratch, join(acme, "tsconfig.json")), include: ["blueprint/**/*.ts"] }));
    cpSync(join(acme, "test/fixtures/layer2/list-read/list.ts"), join(scratch, "blueprint/things/allowance/verbs/list.ts"));
    const model = compile(scratch);
    rmSync(scratch, { recursive: true, force: true });
    return model;
  };
  const models: ReadonlyArray<readonly [string, Model]> = [
    ["acme, current", JSON.parse(read("examples/acme/generated/model/model.json")) as Model],
    ["acme, with a list read", withList()],
    ["acme, as the compiler's snapshot recorded it", JSON.parse(read("packages/compiler/src/modules/model/__snapshots__/acme.model.json")) as Model],
    ["the starter", JSON.parse(read("examples/starter/generated/model/model.json")) as Model],
  ];

  it.each(models)("%s: every operation's dependencies, and every dependency's hash, agree", async (_name, model) => {
    const core = await Effect.runPromise(Wire.core(JSON.parse(JSON.stringify(model))));
    for (const operation of [...Object.keys(model.operations), "nothing.here"]) {
      const expected = Compare.dependsOn(model, operation);
      expect(Wire.dependsOn(core, operation), operation).toEqual(expected);
      for (const key of [...Object.keys(expected), "thing:nope", "operation:nope.nope"]) expect(Wire.hashOf(core, key), key).toBe(Compare.hashOf(model, key));
    }
    const wire = Wire.build({ project: "p", model: JSON.parse(JSON.stringify(model)), docs: {} });
    for (const operation of Object.keys(model.operations)) expect(wire.dependsOnByOperation[operation], operation).toEqual(Compare.dependsOn(model, operation));
  });
});

describe("the portal's data holds no secret a journey step passes to a blank operation", () => {
  const scratch = join(acme, "test/tmp/portal-blank-journey");
  const secret = "hunter2-DISTINCTIVE-4f9a1c";

  it("a journey step calling an operation with a blank part leaves its secret payload literal out of generated/portal/blueprint.json", async () => {
    rmSync(scratch, { recursive: true, force: true });
    mkdirSync(join(scratch, "journeys"), { recursive: true });
    try {
      for (const part of ["blueprint", "package.json"]) cpSync(join(acme, part), join(scratch, part), { recursive: true, filter: (f) => !basename(f).startsWith(".") });
      writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify({ extends: relative(scratch, join(acme, "tsconfig.json")), include: ["blueprint/**/*.ts", "journeys/**/*.ts"] }));
      const signUp = join(scratch, "blueprint/things/person/verbs/sign-up.ts");
      writeFileSync(signUp, readFileSync(signUp, "utf8").replace("steps: { create: Blueprint.step.database() },", 'steps: Blueprint.todo("the steps"),'));
      writeFileSync(join(scratch, "journeys/leak.ts"), [
        'import { Blueprint } from "orthograph";',
        'import signUp from "../blueprint/things/person/verbs/sign-up.ts";',
        'export default Blueprint.journey("a newcomer signs up", {',
        "  cast: { newcomer: Blueprint.anyone },",
        `  steps: (s) => [s.step("the newcomer signs up", s.newcomer.run(signUp, { email: "n@example.test", password: "${secret}", name: "Newcomer" }))],`,
        "});",
        "",
      ].join("\n"));
      const model = compile(scratch);
      expect(Object.keys(model.blankOperations ?? {})).toContain("person.sign-up");
      const portal = (await filesOf("acme", model)).get("generated/portal/blueprint.json")!;
      expect(portal.includes(secret) ? "the secret literal is in the portal's blueprint.json" : "the portal data is clean").toBe("the portal data is clean");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe("the portal stays out of the project's own code", () => {
  const tsFiles = (dir: string): ReadonlyArray<string> =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.name === "node_modules" || d.name === "generated" || d.name === "tmp" ? [] : d.isDirectory() ? tsFiles(join(dir, d.name)) : d.name.endsWith(".ts") ? [join(dir, d.name)] : []));

  it.each(["acme", "starter"])("%s: no blueprint, handler or journey imports the portal or the compiler", (example) => {
    const root = join(repo, "examples", example);
    for (const file of tsFiles(root)) {
      const text = readFileSync(file, "utf8");
      expect(text, relative(repo, file)).not.toMatch(/@orthograph\/(portal|compiler|generators)/);
    }
  });
});
