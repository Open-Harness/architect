// The app projection, on its own: acme's derived map through the mount, a declared map built by hand, the typed links and the
// palette's filter run as a program reads them. The whole path (a blueprint folder, `ortho generate`, `ortho check`) is
// e2e/portal-next/map/projection.test.ts.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { app } from "./service.ts";
import { linksModule } from "./internal/links.ts";
import { paletteModule, paletteOf } from "./internal/palette.ts";
import { viewOf } from "./internal/view.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const render = (m: Model, mount = "app") => Effect.runPromise(app.render({ name: "acme", model: m, mount, mounts: {} }));

const anyone = { kind: "anyone" } as const;
const signedIn = { kind: "signed-in" } as const;
const declared = {
  ...model,
  app: {
    description: "A map.", layout: "topNav", home: "home", hash: "x",
    nav: [{ title: "Main", pages: ["thing", "home"], folded: true }],
    components: { list: { name: "list", file: "f", description: "A list.", shows: [], offers: ["allowance.grant"], hash: "x" } },
    pages: {
      home: { name: "home", file: "f", description: "Home.", route: { path: "/", params: {} }, allowed: [anyone], shows: [], offers: [], components: [], hash: "x" },
      thing: { name: "thing", file: "f", description: "A thing.", route: { path: "/t/:id/:tab", params: {} }, parent: "home", allowed: [signedIn], shows: [], offers: ["allowance.grant"], components: ["list"], hash: "x" },
    },
  },
} as unknown as Model;

describe("app", () => {
  it("is a projection that writes the six files under its own mount, and is refused under another name", async () => {
    expect(app).toMatchObject({ kind: "projection", host: [], ships: ["kept"] });
    expect((await render(model)).map((f) => f.path)).toEqual(["links.ts", "map.json", "navigation.json", "palette.json", "palette.ts", "routes.json"]);
    expect((await Effect.runPromise(Effect.result(app.render({ name: "acme", model, mount: "map", mounts: {} }))))._tag).toBe("Failure");
  });

  it("with no declared map, derives a home, a page per thing and a sidebar of the things, and the model is untouched", () => {
    expect(model.app).toBeUndefined();
    const view = viewOf(model, "acme");
    expect(view.home).toBe("home");
    expect(view.pages.map((p) => p.name)).toContain("home");
    for (const thing of Object.keys(model.things)) {
      expect(view.pages.find((p) => p.name === thing)).toMatchObject({ path: `/things/${thing}`, parent: "home", shows: [] });
    }
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]).toMatchObject({ title: "Things", folded: false });
  });

  it("a declared map replaces the derived one: its groups, its components, the operation's page and component in the palette", () => {
    const view = viewOf(declared, "acme");
    expect(view).toMatchObject({ layout: "topNav", home: "home" });
    expect(view.groups).toEqual([{ title: "Main", folded: true, pages: [{ page: "thing", path: "/t/:id/:tab" }, { page: "home", path: "/" }] }]);
    expect(view.pages.find((p) => p.name === "thing")).toMatchObject({ params: ["id", "tab"], components: [{ name: "list", description: "A list.", offers: ["allowance.grant"] }] });
    expect(paletteOf(view, declared).find((e) => e.kind === "operation")).toMatchObject({ name: "allowance.grant", page: "thing", component: "list" });
  });

  it("links.ts encodes each parameter and keeps the fixed parts as they are", () => {
    const text = linksModule(viewOf(declared, "acme"));
    expect(text.split("\n")[0]).toBe("// Generated from the blueprint. Do not edit.");
    expect(text).toContain('home: (): string => "/",');
    expect(text).toContain('thing: (params: { readonly id: string; readonly tab: string }): string => "/t/" + encodeURIComponent(params.id) + "/" + encodeURIComponent(params.tab),');
  });

  it("palette.ts, run as a program reads it, filters by the caller: an anonymous one sees only `anyone`, a person what a role might open", async () => {
    const dir = mkdtempSync(join(tmpdir(), "app-palette-"));
    const file = join(dir, "palette.ts");
    writeFileSync(file, paletteModule(paletteOf(viewOf(declared, "acme"), declared)));
    const palette = (await import(pathToFileURL(file).href)) as { readonly visibleTo: (caller: "anonymous" | "person") => ReadonlyArray<{ readonly name: string }> };
    rmSync(dir, { recursive: true, force: true });
    expect(palette.visibleTo("anonymous").map((e) => e.name)).toEqual(["home"]);
    expect(palette.visibleTo("person").map((e) => e.name)).toEqual(["home", "thing", "allowance.grant"]);
  });

  it("given the roles a caller holds, palette.ts lists a role-only entry only when they hold that role", async () => {
    const roleOnly = { ...declared, operations: { ...declared.operations, "allowance.grant": { ...declared.operations["allowance.grant"]!, allowed: [{ kind: "role", role: "allowance.owner" }] } } } as unknown as Model;
    const dir = mkdtempSync(join(tmpdir(), "app-palette-"));
    const file = join(dir, "palette.ts");
    writeFileSync(file, paletteModule(paletteOf(viewOf(roleOnly, "acme"), roleOnly)));
    const palette = (await import(pathToFileURL(file).href)) as { readonly visibleTo: (caller: "anonymous" | "person", roles?: ReadonlyArray<string>) => ReadonlyArray<{ readonly name: string }> };
    rmSync(dir, { recursive: true, force: true });
    const names = (roles?: ReadonlyArray<string>) => palette.visibleTo("person", roles).map((e) => e.name);
    expect(names()).toContain("allowance.grant");
    expect(names([])).not.toContain("allowance.grant");
    expect(names(["allowance.owner"])).toContain("allowance.grant");
  });

  it("a thing named home does not make two home pages: the derived home steps aside, and every page name and link key is unique", () => {
    const withHome = { ...model, things: { home: model.things[Object.keys(model.things)[0]!]!, a: model.things[Object.keys(model.things)[0]!]! }, operations: {} } as unknown as Model;
    const view = viewOf(withHome, "x");
    const names = view.pages.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(view.home).toBe("home-page");
    expect(view.pages.find((p) => p.name === "home")).toMatchObject({ path: "/things/home", parent: "home-page" });
    expect(view.pages.find((p) => p.name === "home-page")).toMatchObject({ path: "/" });
    const keys = linksModule(view).split("\n").filter((l) => l.startsWith("  ")).map((l) => l.trim().split(":")[0]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
