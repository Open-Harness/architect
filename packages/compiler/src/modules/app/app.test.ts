// The map's refusals and its layout, on their own: no project, no files on disk. The whole path (a blueprint folder through
// `ortho generate`) is e2e/portal-next/map/compiler.test.ts.
import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import type { FieldModel, Model } from "#modules/model/types.js";
import { allowedOf, paramOf } from "./internal/known.ts";
import { cycles, duplicateRoutes, offerProblems, routeProblems, twiceProblems, type PageFacts } from "./internal/checks.ts";
import { App } from "./service.ts";

const field = (ref?: string, optional?: true): FieldModel => ({ value: { type: "schema" }, ...(ref ? { ref } : {}), ...(optional ? { optional } : {}) });
const model = {
  operations: {
    "profile.get": { payload: { handle: field("handle.name") }, allowed: [{ kind: "anyone" }] },
    "link.order": { payload: { link: field("link.id") }, allowed: [{ kind: "role", role: "link.linkOwner" }] },
    "list.all": { payload: { cursor: field(undefined, true) }, allowed: [{ kind: "anyone" }] },
  },
} as unknown as Model;
const page = (over: Partial<PageFacts>): PageFacts => ({ name: "p", file: "blueprint/app/pages/p.ts", path: "/", params: {}, allowed: [{ kind: "anyone" }], shows: [], offers: [], ...over });
const item = (op: string, file = "blueprint/app/pages/p.ts") => ({ op, file });

describe("app", () => {
  it("setAside takes blueprint/app/ out of the files and leaves the rest", () => {
    const home = Blueprint.page({ description: "Home.", route: { path: "/", params: {} }, allowed: [Blueprint.anyone] });
    const app = Blueprint.app({ description: "An app.", layout: Blueprint.layout.none, home, nav: [] });
    const thing = { path: "things/x/thing.ts", exports: {} };
    const { app: found, rest } = App.setAside([thing, { path: "app/app.ts", exports: { default: app } }, { path: "app/pages/home.ts", exports: { default: home } }, { path: "app/helper.ts", exports: {} }]);
    expect(rest).toEqual([thing]);
    expect(found.present).toBe(true);
    expect([...found.pages.keys()]).toEqual(["home"]);
    expect(found.pages.get("home")?.file).toBe("blueprint/app/pages/home.ts");
    expect(found.problems).toEqual([]);
  });

  it("no app/ folder: not present, nothing set aside, no problem", () => {
    const { app, rest } = App.setAside([{ path: "things/x/thing.ts", exports: {} }]);
    expect(app).toMatchObject({ present: false, problems: [] });
    expect(rest).toHaveLength(1);
  });

  it("an app/ folder with no app.ts is a problem naming the folder", () => {
    expect(App.setAside([{ path: "app/pages/home.ts", exports: { default: {} } }]).app.problems.join("\n")).toContain("blueprint/app/: has no app.ts");
  });

  it("a route's parameters must match its path, in both directions", () => {
    const out = routeProblems(page({ path: "/@:handle", params: { other: field() } }), model);
    expect(out).toHaveLength(2);
    expect(out.every((l) => l.includes("[app-route-param]") && l.startsWith("blueprint/app/pages/p.ts:"))).toBe(true);
  });

  it("a shown read's payload field needs a parameter, by name or by the field it came from; an optional one needs none", () => {
    expect(routeProblems(page({ path: "/@:handle", params: { handle: field("handle.name") }, shows: [item("profile.get")] }), model)).toEqual([]);
    expect(routeProblems(page({ path: "/@:name", params: { name: field("handle.name") }, shows: [item("profile.get")] }), model)).toEqual([]);
    expect(routeProblems(page({ shows: [item("profile.get")] }), model)).toHaveLength(1);
    expect(routeProblems(page({ shows: [item("list.all")] }), model)).toEqual([]);
  });

  it("a parameter no shown read takes is refused, but a page that shows no read is not asked", () => {
    expect(routeProblems(page({ path: "/a/:x", params: { x: field() }, shows: [item("list.all")] }), model)).toHaveLength(1);
    expect(routeProblems(page({ path: "/a/:x", params: { x: field() } }), model)).toEqual([]);
  });

  it("an offer is callable by a page that allows anyone or signed-in, an operation that does, or the same role", () => {
    const offers = [item("link.order")];
    expect(offerProblems(page({ offers, allowed: [{ kind: "signed-in" }] }), model)).toEqual([]);
    expect(offerProblems(page({ offers, allowed: [{ kind: "role", role: "link.linkOwner" }] }), model)).toEqual([]);
    expect(offerProblems(page({ offers: [item("profile.get")], allowed: [{ kind: "role", role: "handle.owner" }] }), model)).toEqual([]);
    const out = offerProblems(page({ offers, allowed: [{ kind: "role", role: "handle.owner" }] }), model);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("[app-offer-uncallable]");
  });

  it("a read or operation named twice names every file that names it", () => {
    const out = twiceProblems(page({ shows: [item("profile.get"), item("profile.get", "blueprint/app/components/c.ts")] }));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("blueprint/app/pages/p.ts");
    expect(out[0]).toContain("blueprint/app/components/c.ts");
    expect(twiceProblems(page({ shows: [item("profile.get")], offers: [item("link.order")] }))).toEqual([]);
  });

  it("two routes that differ only in a parameter's name are one address", () => {
    const out = duplicateRoutes([{ name: "a", file: "a.ts", path: "/@:handle" }, { name: "b", file: "b.ts", path: "/@:name" }, { name: "c", file: "c.ts", path: "/c" }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("a.ts");
    expect(out[0]).toContain("b.ts");
  });

  it("a cycle of parents is reported once, and a page below it is not in it", () => {
    const files = new Map([["a", "a.ts"], ["b", "b.ts"], ["c", "c.ts"]]);
    const out = cycles(new Map([["a", "b"], ["b", "a"], ["c", "a"]]), files);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("a.ts, b.ts");
    expect(out[0]).not.toContain("c.ts");
    expect(cycles(new Map([["a", "b"]]), files)).toEqual([]);
  });

  it("a page is never allowed to the system or the keeper, and a narrowed entry is the entry it narrows", () => {
    const known = { operations: new Map(), roles: new Map(), things: new Map(), values: new Map() };
    const problems: Array<string> = [];
    allowedOf({ kind: "keeper" }, known, "blueprint/app/pages/p.ts", problems);
    allowedOf({ kind: "system" }, known, "blueprint/app/pages/p.ts", problems);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("blueprint/app/pages/p.ts");
    const narrowed = { kind: "narrowed", entry: { kind: "signed-in" }, via: ["web"] } as never;
    expect(allowedOf(narrowed, known, "f", [])).toEqual({ kind: "signed-in" });
  });

  it("a route parameter can't be money (an address carries an id or text), and an id parameter is its value as declared", () => {
    const known = { operations: new Map(), roles: new Map(), things: new Map(), values: new Map() };
    const problems: Array<string> = [];
    paramOf({ kind: "value", meta: { type: "money", bits: 128, signed: false, asset: {} } } as never, known, "blueprint/app/pages/p.ts", problems);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("blueprint/app/pages/p.ts");
    expect(problems[0]).toContain("can't be money");
    const ok: Array<string> = [];
    expect(paramOf({ kind: "value", meta: { type: "id", prefix: "lnk" } } as never, known, "f", ok).value).toEqual({ type: "id", prefix: "lnk" });
    expect(ok).toEqual([]);
  });

  it("a route segment is literal text with at most one :name at its end: /@:handle is, /:year-:month is not", () => {
    expect(routeProblems(page({ path: "/@:handle", params: { handle: field() } }), model)).toEqual([]);
    expect(routeProblems(page({ path: "/a/:id", params: { id: field() } }), model)).toEqual([]);
    for (const path of ["/:year-:month", "/:a:b", "/:id.json"]) {
      const out = routeProblems(page({ path, params: {} }), model);
      expect(out.some((l) => l.includes("[app-route-param]") && l.includes("blueprint/app/pages/p.ts") && l.includes("is not literal text")), path).toBe(true);
    }
  });

  it("a route with a trailing slash or an empty segment is refused, and the root `/` is not", () => {
    expect(routeProblems(page({ path: "/" }), model)).toEqual([]);
    for (const path of ["/account/", "/a//b", "//"]) {
      const out = routeProblems(page({ path }), model);
      expect(out.some((l) => l.includes("[app-route-param]") && l.includes("empty segment")), path).toBe(true);
    }
  });

  it("a role for an outside service never opens a page: plain, scoped, and narrowed then scoped", () => {
    const service = { kind: "role", service: {} };
    const scoped = { kind: "role-of", role: service, path: "id" };
    const known = { operations: new Map(), roles: new Map<unknown, string>([[service, "link.svc"]]), things: new Map(), values: new Map() };
    for (const a of [service, scoped, { kind: "narrowed", entry: scoped, via: ["web"] }]) {
      const problems: Array<string> = [];
      allowedOf(a as never, known, "blueprint/app/pages/p.ts", problems);
      expect(problems, JSON.stringify(a)).toHaveLength(1);
      expect(problems[0]).toContain("outside service");
    }
    const plain = { kind: "role" };
    const ok: Array<string> = [];
    allowedOf({ kind: "role-of", role: plain, path: "id" } as never, { ...known, roles: new Map<unknown, string>([[plain, "a.b"]]) }, "f", ok);
    expect(ok).toEqual([]);
  });
});
