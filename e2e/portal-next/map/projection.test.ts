// Goal 6, slice 2: the app projection's checks (slice 4; K31 "What falls out", K36 section 4), written first and failing. The projection is
// mounted like the others, by one file, and writes `generated/app/`. Black box, as compiler.test.ts: a copy of Plugged In, the fixture
// folders `good` (a declared map), `mount` and, for the typed links, a `src/` file that uses them; `ortho generate`, `ortho check`.
//
// THE CONTRACT slice 4 meets (K31 leaves the names and shapes open, so this file chooses):
//  Mounting: `blueprint/projections/app.ts` is `export default Blueprint.use(app)`, with `app` imported from `@orthograph/projections`
//    (the way `server` or `mcp` are). Unmounted, nothing is written: a project may declare a map and not use it.
//  Files, exactly these and no others, in `generated/app/`. The two `.ts` files open with `// Generated from blueprint/projections/app.ts.
//    Do not edit.`; the JSON files are data, in the order said, two spaces of indent, a newline at the end:
//    routes.json      { routes: [{ page, path, params: [<name>], parent?, allowed, description }] }          pages by name
//    navigation.json  { layout, home, groups: [{ title, folded, pages: [{ page, path }] }] }                  in declared order
//    palette.json     { entries: [<page entry>..., <operation entry>...] }, with
//                       page entry       { kind: "page", name, path, description, allowed }                  by page name
//                       operation entry  { kind: "operation", name: "link.order", page, component: <name> | null, description, allowed }
//                                        one for each operation a page offers (its effective offers), by page, then operation
//    map.json         { layout, home, pages: [{ name, path, params: [<name>], description, parent?, allowed, shows, offers,
//                       components: [{ name, description, shows, offers }] }], groups }    the agent's map: where it can go, what it can do
//                     there; a page's `shows` and `offers` are the effective lists (K36), a component keeps its own
//    links.ts         `export const links`: one function per page, named by the page: `links.home()`, `links.profile({ handle })`.
//                     A parameter is a `string`, in the address percent-encoded (`encodeURIComponent`). A page that is not declared,
//                     a parameter that is wrong or missing, fails `tsc` (so `ortho check`) in the file that wrote it
//    palette.ts       `export const visibleTo = (caller: "anonymous" | "person") => <entries of palette.json>`: what the caller may open
//                     and call. A page entry is visible to an anonymous caller when its `allowed` has `anyone`, to a person when it has
//                     `anyone`, `signed-in` or a role (a role is decided on an instance, so it is not ruled out for a person). An
//                     operation entry is visible when its page's entry is and its own `allowed` passes the same rule.
//  The derived default (K31, section 5): with no `blueprint/app/`, a mounted projection derives the map and never writes it into the model:
//    layout `sidebar`, home `home` (path `/`, nothing shown or offered), a page per thing, named by the thing, at `/things/<thing>`,
//    that offers every operation of the thing and shows none, all `allowed: [{ kind: "anyone" }]`, and one navigation group, `Things`,
//    not folded, with the thing pages by name. A declared map replaces all of it.
import { afterAll, describe, expect, it } from "vitest";
import { evaluate, generated, modelOf, project, type Project } from "./support.ts";

const live: Array<Project> = [];
const made = (overlays: ReadonlyArray<string>): Project => { const p = project(overlays); live.push(p); return p; };
afterAll(() => { for (const p of live.splice(0)) p.remove(); });
/** Build once, and fail the same way for every test that needs it (a failed build is not retried thirty times). */
const once = <T,>(make: () => T): (() => T) => {
  let result: { readonly value: T } | { readonly error: unknown } | undefined;
  return () => {
    if (result === undefined) { try { result = { value: make() }; } catch (error) { result = { error }; } }
    if ("error" in result) throw result.error;
    return result.value;
  };
};

const FILES = ["links.ts", "map.json", "navigation.json", "palette.json", "palette.ts", "routes.json"];
const HEADER = "// Generated from blueprint/projections/app.ts. Do not edit.";
const anyone = { kind: "anyone" };
const signedIn = { kind: "signed-in" };

type Entry = { readonly kind: string; readonly name: string; readonly page?: string; readonly component?: string | null };
const names = (entries: ReadonlyArray<Entry>) => entries.map((e) => (e.kind === "page" ? e.name : `${e.page ?? ""}/${e.name}`));
const visible = (p: Project, caller: string) => names(evaluate(p, "generated/app/palette.ts", `m.visibleTo(${JSON.stringify(caller)})`) as Entry[]);

describe("a declared map, mounted", () => {
  const good = once((): Project => generated(made(["good", "mount"])));

  it("writes generated/app/ with exactly the six files, the two TypeScript ones headed, and the model still holds the map", () => {
    const p = good();
    expect(p.files("generated/app")).toEqual(FILES.map((f) => `generated/app/${f}`));
    for (const f of ["links.ts", "palette.ts"]) expect(p.read(`generated/app/${f}`).split("\n")[0]).toBe(HEADER);
    for (const f of FILES.filter((x) => x.endsWith(".json"))) expect(p.read(`generated/app/${f}`)).toBe(`${JSON.stringify(JSON.parse(p.read(`generated/app/${f}`)), null, 2)}\n`);
    expect(Object.keys(modelOf(p))).toContain("app");
    expect(modelOf(p)["mounts"]).toHaveProperty("app");
  }, 900_000);

  it("a second run has nothing to change", () => {
    expect(good().ortho("generate").out).toContain("nothing to change");
  }, 900_000);

  it("routes.json: a route for each page, by page name", () => {
    const { routes } = good().json<{ routes: Array<{ page: string }> }>("generated/app/routes.json");
    expect(routes.map((r) => r.page)).toEqual(["account", "edit", "home", "profile", "thing"]);
    expect(routes).toMatchObject([
      { page: "account", path: "/account", params: [], parent: "home", allowed: [signedIn] },
      { page: "edit", path: "/@:handle/edit", params: ["handle"], parent: "profile", allowed: [signedIn] },
      { page: "home", path: "/", params: [], allowed: [anyone], description: "Claim a name, or find one." },
      { page: "profile", path: "/@:handle", params: ["handle"], parent: "home", allowed: [anyone] },
      { page: "thing", path: "/things/:name", params: ["name"], parent: "home", allowed: [anyone] },
    ]);
    expect(routes[2]).not.toHaveProperty("parent");
  }, 900_000);

  it("navigation.json: the layout, home and the groups as declared, folded kept", () => {
    expect(good().json("generated/app/navigation.json")).toEqual({
      layout: "sidebar",
      home: "home",
      groups: [
        { title: "Your page", folded: false, pages: [{ page: "profile", path: "/@:handle" }, { page: "edit", path: "/@:handle/edit" }] },
        { title: "Settings", folded: true, pages: [{ page: "account", path: "/account" }] },
        { title: "Things", folded: false, pages: [{ page: "thing", path: "/things/:name" }] },
      ],
    });
  }, 900_000);

  it("map.json: each page with its effective lists and its components, and what the component offers", () => {
    const map = good().json<{ pages: Array<{ name: string }> }>("generated/app/map.json");
    expect(map).toMatchObject({ layout: "sidebar", home: "home" });
    expect(map.pages.map((x) => x.name)).toEqual(["account", "edit", "home", "profile", "thing"]);
    expect(map.pages.find((x) => x.name === "edit")).toEqual({
      name: "edit", path: "/@:handle/edit", params: ["handle"], description: "Edit your page: order and remove your links.", parent: "profile", allowed: [signedIn],
      shows: ["profile.get"], offers: ["link.order", "link.remove"],
      components: [{ name: "link-list", description: "Your links, in order; move one or remove it.", shows: ["profile.get"], offers: ["link.order", "link.remove"] }],
    });
    expect(map.pages.find((x) => x.name === "profile")).toMatchObject({ shows: ["profile.get"], offers: ["link.add", "handle.release"], components: [] });
    expect(good().json<{ groups: unknown[] }>("generated/app/map.json").groups).toHaveLength(3);
  }, 900_000);

  it("palette.json: the pages by name, then each operation a page offers, naming its page and component", () => {
    const { entries } = good().json<{ entries: Array<Entry> }>("generated/app/palette.json");
    expect(names(entries)).toEqual(["account", "edit", "home", "profile", "thing", "edit/link.order", "edit/link.remove", "home/handle.claim", "profile/handle.release", "profile/link.add"]);
    expect(entries.find((e) => e.name === "link.order")).toMatchObject({ kind: "operation", page: "edit", component: "link-list", allowed: [{ kind: "role", role: "link.linkOwner" }] });
    expect(entries.find((e) => e.name === "link.add")).toMatchObject({ page: "profile", component: null, allowed: [signedIn] });
    expect(entries.find((e) => e.name === "edit")).toMatchObject({ kind: "page", path: "/@:handle/edit", allowed: [signedIn] });
  }, 900_000);

  it("palette.ts lists only what the caller may open and call", () => {
    const p = good();
    expect(visible(p, "anonymous")).toEqual(["home", "profile", "thing"]);
    expect(visible(p, "person")).toEqual(["account", "edit", "home", "profile", "thing", "edit/link.order", "edit/link.remove", "home/handle.claim", "profile/handle.release", "profile/link.add"]);
  }, 900_000);

  it("links.ts: a typed link per page, parameters encoded", () => {
    const p = good();
    const links = (expression: string) => evaluate(p, "generated/app/links.ts", expression);
    expect(links(`[m.links.home(), m.links.account(), m.links.profile({ handle: "aaron" })]`)).toEqual(["/", "/account", "/@aaron"]);
    expect(links(`[m.links.edit({ handle: "a b" }), m.links.thing({ name: "x/y" })]`)).toEqual(["/@a%20b/edit", "/things/x%2Fy"]);
    expect(Object.keys(links("m.links") as object).sort()).toEqual(["account", "edit", "home", "profile", "thing"]);
  }, 900_000);
});

describe("typed links fail `tsc`, in the file that uses them", () => {
  const checked = (extra: string) => { const p = generated(made(["good", "mount", extra])); return p.ortho("check"); };
  it("a right use checks", () => { const r = checked("links-ok"); expect(r.status, r.out).toBe(0); }, 900_000);
  for (const [extra, why] of [["links-wrong-param", "a wrong parameter"], ["links-missing-param", "a missing parameter"], ["links-unknown-page", "a page that is not declared"]] as const) {
    it(`${why} does not`, () => {
      const r = checked(extra);
      expect(r.status, r.out).not.toBe(0);
      expect(r.out).toContain("src/uses-links.ts");
    }, 900_000);
  }
});

describe("the derived default, with no blueprint/app/", () => {
  const derived = once((): Project => generated(made(["mount"])));

  it("writes the same six files, and the model still has no `app`", () => {
    expect(derived().files("generated/app")).toEqual(FILES.map((f) => `generated/app/${f}`));
    expect(Object.keys(modelOf(derived()))).not.toContain("app");
  }, 900_000);

  it("a home, a page per thing offering its operations, and a sidebar of the things", () => {
    const map = derived().json<{ layout: string; home: string; pages: Array<{ name: string }>; groups: unknown }>("generated/app/map.json");
    expect(map).toMatchObject({ layout: "sidebar", home: "home" });
    expect(map.pages).toEqual([
      { name: "handle", path: "/things/handle", params: [], description: expect.any(String), parent: "home", allowed: [anyone], shows: [], offers: ["handle.claim", "handle.release", "handle.resolve"], components: [] },
      { name: "home", path: "/", params: [], description: expect.any(String), allowed: [anyone], shows: [], offers: [], components: [] },
      { name: "link", path: "/things/link", params: [], description: expect.any(String), parent: "home", allowed: [anyone], shows: [], offers: ["link.add", "link.order", "link.remove"], components: [] },
      { name: "profile", path: "/things/profile", params: [], description: expect.any(String), parent: "home", allowed: [anyone], shows: [], offers: ["profile.get"], components: [] },
    ]);
    expect(map.groups).toEqual([{ title: "Things", folded: false, pages: [{ page: "handle", path: "/things/handle" }, { page: "link", path: "/things/link" }, { page: "profile", path: "/things/profile" }] }]);
  }, 900_000);

  it("its palette lists the pages, and an anonymous caller only the operation anyone may call", () => {
    expect(visible(derived(), "anonymous")).toEqual(["handle", "home", "link", "profile", "handle/handle.resolve"]);
    expect(visible(derived(), "person")).toHaveLength(4 + 7);
  }, 900_000);

  it("unmounted, a project with no map writes no generated/app/", () => {
    expect(generated(made([])).exists("generated/app")).toBe(false);
  }, 900_000);
});
