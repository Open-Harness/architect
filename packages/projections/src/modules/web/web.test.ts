// The web projection: Plugged In's pieces, rendered through the mount, are what it has committed under generated/web/; each operation is a read, a move or a
// write by what its model says; an id is the thing the piece is about and not an input; a yes is a dialog; a read reloads on the things it shows.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model, OperationModel } from "@orthograph/compiler";
import { web } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const pluggedIn = join(repo, "examples/plugged-in");
const model = JSON.parse(readFileSync(join(pluggedIn, "generated/model/model.json"), "utf8")) as Model;
const render = (m: Model, mount = "web") => Effect.runPromise(web.render({ name: "plugged-in", model: m, mount, mounts: m.mounts ?? {} }));
const text = async (path: string, m: Model = model) => (await render(m)).find((f) => f.path === path)!.content;
const op = (name: string, change: Partial<OperationModel>): Model => ({ ...model, operations: { ...model.operations, [name]: { ...model.operations[name]!, ...change } } });

describe("web", () => {
  it("renders a primitive and its React parts for each operation, and the provider, as Plugged In has them committed", async () => {
    expect(web).toMatchObject({ kind: "projection", host: ["browser"], ships: ["release"] });
    const files = await render(model);
    const operations = Object.values(model.operations).flatMap((o) => [`${o.thing}/${o.verb}.ts`, `${o.thing}/${o.verb}.react.tsx`]);
    expect(files.map((f) => f.path).sort()).toEqual(["react.tsx", ...operations].sort());
    for (const file of files) expect(file.content).toBe(readFileSync(join(pluggedIn, "generated/web", file.path), "utf8"));
  });

  it("tells a read, a move and a write by the model: a read loads, the others are forms", async () => {
    expect(await text("profile/get.ts")).toContain("piece.readApi(context");
    expect(await text("handle/claim.ts")).toContain("piece.api(context");
    expect(await text("link/order.ts")).toContain("piece.api(context");
    expect(await text("profile/get.react.tsx")).not.toContain("Submit");
  });

  it("makes an id the thing the piece is about and every other payload field an input", async () => {
    expect(await text("link/order.ts")).toContain(`fields: ["position"], subject: ["link"]`);
    const order = await text("link/order.react.tsx");
    expect(order).toContain(`<Field name="position">`);
    expect(order).not.toContain(`<Field name="link">`);
    expect(order).toContain("readonly link: string;");
  });

  it("gives an operation that needs a yes a dialog whose confirming button carries its description, and none that doesn't", async () => {
    const release = await text("handle/release.react.tsx");
    expect(release).toContain("AlertDialogContent");
    expect(release).toContain(`data-agent-confirm={${JSON.stringify(model.operations["handle.release"]!.description)}}`);
    expect(await text("handle/claim.react.tsx")).not.toContain("AlertDialog");
    const without = await text("handle/release.react.tsx", op("handle.release", { needsApproval: undefined as never }));
    expect(without).not.toContain("AlertDialog");
    expect(without).toContain("Form:");
  });

  it("derives what a read reloads on from the things that refer to it and the ones it refers to", async () => {
    expect(await text("profile/get.ts")).toContain(`reloadsOn: ["profile", "link", "handle"]`);
    expect(await text("handle/resolve.ts")).toContain(`reloadsOn: ["handle", "link", "profile"]`);
  });

  it("marks a secret field for an agent as a password it fills and never reads, and an optional one as not required", async () => {
    const secret = op("handle.claim", { payload: { name: { ...model.operations["handle.claim"]!.payload["name"]!, visibility: "secret", optional: true } } });
    const claim = await text("handle/claim.react.tsx", secret);
    expect(claim).toContain(`data-agent-secret=""`);
    expect(claim).toContain(`type="password"`);
    expect(claim).not.toContain("required");
    expect(await text("handle/claim.ts", secret)).toContain(`optional: ["name"]`);
  });

  it("keeps a description's comment end inside the doc comment and in the strings", async () => {
    const hostile = op("handle.claim", { description: "closes */ early" });
    expect(await text("handle/claim.ts", hostile)).toContain("/** closes *\\/ early */");
  });

  it("renders acme's operations too, a sign-in's password a secret and its issued answer never shown nor readable by an agent", async () => {
    const acme = JSON.parse(readFileSync(join(repo, "examples/acme/generated/model/model.json"), "utf8")) as Model;
    const files = await Effect.runPromise(web.render({ name: "acme", model: acme, mount: "web", mounts: {} }));
    expect(files.length).toBe(Object.keys(acme.operations).length * 2 + 1);
    const byPath = (path: string) => files.find((f) => f.path === path)!.content;
    expect(byPath("session/sign-in.react.tsx")).toContain(`<Field name="password" data-agent-secret="">`);
    expect(byPath("session/sign-in.react.tsx")).not.toContain("<Answer />");
    expect(byPath("session/sign-in.ts")).toContain(`agent: { actions: ["submit"], secret: true }`);
    expect(byPath("organization/create.react.tsx")).toContain("<Answer />");
    expect(byPath("react.tsx")).toContain("export const AcmeHost = HostContext;");
  });

  it("is refused under another mount name", async () => {
    const made = await Effect.runPromise(Effect.result(web.render({ name: "plugged-in", model, mount: "pieces", mounts: {} })));
    expect(made._tag).toBe("Failure");
  });
});
