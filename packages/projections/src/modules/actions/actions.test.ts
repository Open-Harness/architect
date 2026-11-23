// The actions projection: acme's actions, rendered through the mount, are what acme has committed under generated/actions/; the model decides
// the flags; a comment's end in a description cannot cut its doc comment short; and the mount name is the folder's.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { actions } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const render = (m: Model) => Effect.runPromise(actions.render({ name: "acme", model: m, mount: "actions", mounts: m.mounts ?? {} }));

describe("actions", () => {
  it("renders one module per operation, relative to generated/actions/, as acme has them committed", async () => {
    expect(actions).toMatchObject({ kind: "projection", ships: ["release"] });
    const files = await render(model);
    expect(files.map((f) => f.path).sort()).toEqual(Object.values(model.operations).map((o) => `${o.thing}/${o.verb}.ts`).sort());
    for (const file of files) expect(file.content).toBe(readFileSync(join(acme, "generated/actions", file.path), "utf8"));
  });

  it("says readOnly of an operation with no move and only load steps, and of nothing else", async () => {
    const files = await render(model);
    const flag = (path: string) => /readOnly: (true|false)/.exec(files.find((f) => f.path === path)!.content)![1];
    expect([flag("organization/get.ts"), flag("allowance/spend.ts"), flag("api-key/create.ts")]).toEqual(["true", "false", "false"]);
  });

  it("reaches a thing or a verb that is not an identifier by its name, and keeps a description's comment end inside the doc comment", async () => {
    const hostile: Model = { ...model, operations: { ...model.operations, "person.sign-up": { ...model.operations["person.sign-up"]!, description: "closes */ early" } } };
    const text = (await render(hostile)).find((f) => f.path === "person/sign-up.ts")!.content;
    expect(text).toContain('client.person["sign-up"]({ payload: args })');
    expect(text).toContain("/** closes *\\/ early */");
    expect(text).toContain('description: "closes */ early"');
  });

  it("is refused under another mount name", async () => {
    const made = await Effect.runPromise(Effect.result(actions.render({ name: "acme", model, mount: "tools", mounts: {} })));
    expect(made._tag).toBe("Failure");
  });
});
