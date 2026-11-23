import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Roles } from "#modules/roles/service.js";
import { Apps } from "./service.ts";

const home = Apps.page({ description: "Home.", route: { path: "/", params: {} }, allowed: [Roles.anyone] });

describe("app", () => {
  it("a page is a frozen declaration with no name: its file's name is its name", () => {
    expect(home.kind).toBe("app-page");
    expect("name" in home).toBe(false);
    expect(Object.isFrozen(home)).toBe(true);
  });

  it("a page's parent may be a thunk, so a parent that is also a child can be written", () => {
    const child = Apps.page({ description: "Child.", route: { path: "/child/:id", params: { id: Values.text() } }, allowed: [Roles.anyone], parent: () => home });
    expect(typeof child.parent).toBe("function");
  });

  it("a component carries what and never how", () => {
    const c = Apps.component({ description: "A list.", shows: [], offers: [] });
    expect(c).toMatchObject({ kind: "app-component", description: "A list." });
  });

  it("the layouts are three named values", () => {
    expect(Object.values(Apps.layout).map((l) => l.which)).toEqual(["sidebar", "topNav", "none"]);
  });

  it("an app holds its layout, home and navigation; a group is not folded unless said", () => {
    const group = Apps.nav.group({ title: "Pages", pages: [home] });
    expect(group.folded).toBe(false);
    expect(Apps.nav.group({ title: "More", pages: [home], folded: true }).folded).toBe(true);
    const app = Apps.app({ description: "An app.", layout: Apps.layout.sidebar, home, nav: [group] });
    expect(app).toMatchObject({ kind: "app", home, nav: [group] });
  });
});
