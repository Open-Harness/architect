// Goal 6, slice 2: the map language and the compiler's checks (K31, K36), written first and failing. Black box: a copy of Plugged In,
// a fixture folder of `blueprint/app/` laid over it (`e2e/portal-next/fixtures/<case>/`), `ortho generate` run as a user runs it; the
// check reads its exit code, its words and `generated/model/model.json`. The fixtures are not typechecked here (they use the API
// that does not exist yet); they are what slice 3's builder must make compile.
//
// THE CONTRACT slice 3 meets (K31 and K36 leave these open, so this file chooses):
//  Language, in `orthograph`'s new `app` module (each a frozen object, nothing else of `Blueprint` changes):
//    Blueprint.app({ description, layout, home, nav })    blueprint/app/app.ts, `export default`
//    Blueprint.layout.sidebar | .topNav | .none            the layouts (K31, section 3)
//    Blueprint.nav.group({ title, pages, folded? })        `folded` defaults to false
//    Blueprint.page({ description, route: { path, params }, allowed, parent?, shows?, offers?, components? })
//                                                           blueprint/app/pages/<name>.ts; a page's type is `AppPage`
//    Blueprint.component({ description, shows?, offers? })  blueprint/app/components/<name>.ts (K36)
//    `route.params` is always written (`{}` for none); a parameter is typed by a field (`Handle.fields.name`) or a value
//    (`Blueprint.text()`). `shows` takes the operations that read (as K31's `shows: [get]` does), `offers` operations.
//    `home`, `parent` and a nav group's `pages` take a page; `parent` also takes a thunk `() => page`, since a parent that is
//    also its own child's parent cannot be written with plain imports, and the compiler must refuse the cycle.
//    A page's name is its file's name, a component's likewise.
//  The model: `model.app` only when the project has `blueprint/app/` (otherwise no `app` key at all). It holds
//    { description, layout, home, nav: [{ title, pages, folded }], pages: { <name>: { name, file, description, route: { path,
//      params: { <param>: FieldModel } }, parent?, allowed, shows, offers, components, hash } },
//      components: { <name>: { name, file, description, shows, offers, hash } }, hash }
//    `shows` and `offers` on a page are its effective lists (its own, then each component's, K36), as operation names
//    (`profile.get`); `allowed` is as an operation's (`{ kind: "anyone" }`, `{ kind: "role", role: "link.linkOwner" }`).
//    Hashed like things: equal inputs, equal hash; a changed page changes its hash and the app's, not another page's.
//  The refusals, five kinds (K31's four, K36's one), each a problem of `ortho generate`, which exits 2 and writes nothing. A
//    problem is one line, `<file>: [<tag>] <words>`: the file is a path from the project (`blueprint/app/pages/profile.ts`), and
//    every other file the problem involves is named in the words. The tags:
//      app-route-param      a route parameter no shown read's payload takes, or a shown read's payload field that no route
//                           parameter supplies (a field the caller may leave out needs none)
//      app-offer-uncallable an offered operation none of the page's `allowed` roles may call: it may be called by a page that
//                           allows `anyone` or `signed-in`, by one whose operation allows `anyone`, or by the same role
//      app-undeclared-page  `home`, a nav group's page or a `parent` that is not a file of `blueprint/app/pages/`
//      app-parent-cycle     pages whose parents lead back to themselves
//      app-duplicate-route  two pages at one address (`/@:handle` and `/@:name` are one address)
//      app-named-twice      a read or operation named twice among a page and the components it holds (K36)
//    Both page checks run over the page's effective `shows` and `offers`, so a component is checked on every page that holds it.
//    A page that shows no read is checked for none of the route-parameter rules except that each parameter has a type.
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generated, modelOf, project, type Project } from "./support.ts";

const live: Array<Project> = [];
const made = (overlays: ReadonlyArray<string>): Project => { const p = project(overlays); live.push(p); return p; };
afterAll(() => { for (const p of live.splice(0)) p.remove(); });

const PAGES = "blueprint/app/pages/";
const COMPONENTS = "blueprint/app/components/";
const model = (p: Project) => modelOf(p);

describe("the map in the model", () => {
  let good: Project;
  beforeAll(() => { good = generated(made(["good"])); }, 600_000);

  it("a project with no app/ folder has no `app` key", () => {
    const plain = generated(made([]));
    expect(Object.keys(model(plain))).not.toContain("app");
    expect(Object.keys(model(plain))).toEqual(expect.arrayContaining(["things", "operations"]));
  }, 600_000);

  it("holds the app, its navigation, every page and the component", () => {
    expect(model(good)["app"]).toMatchObject({
      description: "Claim a name and keep a public page of links.",
      layout: "sidebar",
      home: "home",
      nav: [
        { title: "Your page", pages: ["profile", "edit"], folded: false },
        { title: "Settings", pages: ["account"], folded: true },
        { title: "Things", pages: ["thing"], folded: false },
      ],
    });
    expect(Object.keys(model(good)["app"].pages).sort()).toEqual(["account", "edit", "home", "profile", "thing"]);
    expect(Object.keys(model(good)["app"].components)).toEqual(["link-list"]);
  });

  it("a page: its file, route, parent, who may open it, and what it shows and offers", () => {
    const pages = model(good)["app"].pages;
    expect(pages.profile).toMatchObject({
      name: "profile", file: `${PAGES}profile.ts`, route: { path: "/@:handle", params: { handle: { ref: "handle.name" } } }, parent: "home",
      allowed: [{ kind: "anyone" }], shows: ["profile.get"], offers: ["link.add", "handle.release"], components: [],
    });
    expect(pages.home).toMatchObject({ route: { path: "/", params: {} }, offers: ["handle.claim"], shows: [] });
    expect(pages.home).not.toHaveProperty("parent");
    expect(pages.account).toMatchObject({ allowed: [{ kind: "signed-in" }], parent: "home" });
  });

  it("a page's effective lists include its components'; the component keeps its own", () => {
    const app = model(good)["app"];
    expect(app.pages.edit).toMatchObject({ parent: "profile", components: ["link-list"], shows: ["profile.get"], offers: ["link.order", "link.remove"] });
    expect(app.components["link-list"]).toMatchObject({
      name: "link-list", file: `${COMPONENTS}link-list.ts`, description: "Your links, in order; move one or remove it.", shows: ["profile.get"], offers: ["link.order", "link.remove"],
    });
  });

  it("a page that shows no read types its parameter with a value, and compiles (the portal's `/things/:name`)", () => {
    expect(model(good)["app"].pages.thing).toMatchObject({ route: { path: "/things/:name", params: { name: { value: { type: "text" } } } }, shows: [], offers: [] });
  });

  it("every page, the component and the app carry a hash, and two runs agree", () => {
    const again = generated(made(["good"]));
    const [a, b] = [model(good)["app"], model(again)["app"]];
    for (const entry of [a, ...Object.values<{ hash: string }>(a.pages), ...Object.values<{ hash: string }>(a.components)]) expect(entry.hash).toMatch(/^.{8,}$/);
    expect(b.hash).toBe(a.hash);
    expect(b.pages.profile.hash).toBe(a.pages.profile.hash);
    expect(b.components["link-list"].hash).toBe(a.components["link-list"].hash);
  }, 600_000);

  it("a changed page changes its hash and the app's, and no other page's", () => {
    const before = model(good)["app"];
    const moved = made(["good"]);
    const file = `${moved.root}/${PAGES}profile.ts`;
    const edited = moved.read(`${PAGES}profile.ts`).replace("A claimed name's public page and its links.", "A claimed name's page.");
    expect(edited).not.toBe(moved.read(`${PAGES}profile.ts`));
    writeFileSync(file, edited);
    generated(moved);
    const after = model(moved)["app"];
    expect(after.pages.profile.hash).not.toBe(before.pages.profile.hash);
    expect(after.hash).not.toBe(before.hash);
    for (const other of ["home", "account", "thing"]) expect(after.pages[other].hash, other).toBe(before.pages[other].hash);
  }, 600_000);

  it("a page whose own role may call what it offers compiles (a scoped role offers what that role may call)", () => {
    const scoped = generated(made(["good", "scoped-ok"]));
    expect(model(scoped)["app"].pages.account).toMatchObject({ allowed: [{ kind: "role", role: "link.linkOwner" }], offers: ["link.remove"], shows: [] });
  }, 600_000);

  it("declaring the map writes no app projection unless the project mounts it", () => {
    expect(good.exists("generated/app")).toBe(false);
  });
});

// Each refusal: the case folder, the tag, and the files the one problem line names.
const REFUSALS: ReadonlyArray<readonly [string, string, ReadonlyArray<string>]> = [
  ["param-unused", "app-route-param", [`${PAGES}profile.ts`]],
  ["payload-unsupplied", "app-route-param", [`${PAGES}profile.ts`]],
  ["component-unsupplied-param", "app-route-param", [`${PAGES}account.ts`, `${COMPONENTS}link-list.ts`]],
  ["offer-uncallable", "app-offer-uncallable", [`${PAGES}account.ts`]],
  ["component-uncallable", "app-offer-uncallable", [`${PAGES}account.ts`, `${COMPONENTS}link-list.ts`]],
  ["nav-undeclared", "app-undeclared-page", ["blueprint/app/app.ts"]],
  ["home-undeclared", "app-undeclared-page", ["blueprint/app/app.ts"]],
  ["parent-undeclared", "app-undeclared-page", [`${PAGES}account.ts`]],
  ["parent-cycle", "app-parent-cycle", [`${PAGES}profile.ts`, `${PAGES}edit.ts`]],
  ["duplicate-route", "app-duplicate-route", [`${PAGES}account.ts`, `${PAGES}profile.ts`]],
  ["duplicate-route-renamed", "app-duplicate-route", [`${PAGES}account.ts`, `${PAGES}profile.ts`]],
  ["read-twice", "app-named-twice", [`${PAGES}profile.ts`, `${COMPONENTS}link-list.ts`]],
  ["op-twice-components", "app-named-twice", [`${PAGES}edit.ts`, `${COMPONENTS}link-list.ts`, `${COMPONENTS}also-order.ts`]],
];
const TAGS = [...new Set(REFUSALS.map(([, tag]) => tag))];

describe("the compiler's five refusals", () => {
  for (const [name, tag, files] of REFUSALS) {
    it(`${name}: a ${tag} problem naming ${files.map((f) => f.replace("blueprint/app/", "")).join(" and ")}, and nothing generated`, () => {
      const p = made(["good", name]);
      const before = p.read("generated/model/model.json");
      const result = p.ortho("generate");
      expect(result.status, result.out).toBe(2);
      const lines = result.out.split("\n").filter((l) => l.includes(`[${tag}]`));
      expect(lines.length, `no line with [${tag}]:\n${result.out}`).toBeGreaterThan(0);
      expect(lines.some((l) => files.every((f) => l.includes(f))), `no [${tag}] line names ${files.join(", ")}:\n${lines.join("\n")}`).toBe(true);
      for (const other of TAGS.filter((t) => t !== tag)) expect(result.out, `${name} is not an ${other}`).not.toContain(`[${other}]`);
      expect(p.read("generated/model/model.json")).toBe(before);
      expect(p.exists("generated/app")).toBe(false);
    }, 600_000);
  }
});
