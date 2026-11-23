import { describe, expect, it } from "vitest";
import { Router } from "../router/service.ts";
import { Navigation } from "./service.ts";
import type { NavigationData } from "./types.ts";

const router = Router.make(
  {
    routes: [
      { page: "account", path: "/account", params: [], parent: "home" },
      { page: "edit", path: "/@:handle/edit", params: ["handle"], parent: "profile" },
      { page: "home", path: "/", params: [] },
      { page: "profile", path: "/@:handle", params: ["handle"], parent: "home" },
    ],
  },
  "home",
);
const data: NavigationData = {
  layout: "sidebar",
  home: "home",
  groups: [
    { title: "Your page", folded: false, pages: [{ page: "profile", path: "/@:handle" }, { page: "edit", path: "/@:handle/edit" }] },
    { title: "Settings", folded: true, pages: [{ page: "account", path: "/account" }] },
  ],
};
const at = (path: string) => {
  const current = router.match(path);
  return Navigation.derive(data, (page) => router.href(page, current?.params ?? {}), current);
};

describe("derive", () => {
  it("keeps the groups and their pages in the order declared, with the fold", () => {
    expect(at("/account").map((g) => [g.title, g.folded, g.items.map((i) => i.page)])).toEqual([["Your page", false, ["profile", "edit"]], ["Settings", true, ["account"]]]);
  });

  it("makes a page a link only where the route has its parameters, and resolves it with them", () => {
    expect(at("/account")[0]?.items.map((i) => i.href)).toEqual([undefined, undefined]);
    expect(at("/@aaron")[0]?.items.map((i) => i.href)).toEqual(["/@aaron", "/@aaron/edit"]);
    expect(at("/@aaron")[1]?.items.map((i) => i.href)).toEqual(["/account"]);
  });

  it("marks the page shown, and none on the 404", () => {
    expect(at("/@aaron/edit").flatMap((g) => g.items).filter((i) => i.current).map((i) => i.page)).toEqual(["edit"]);
    expect(at("/nowhere").flatMap((g) => g.items).filter((i) => i.current)).toEqual([]);
  });
});

describe("layoutOf", () => {
  it("reads the three layouts, and takes the sidebar for anything else", () => {
    expect(["sidebar", "topNav", "none", "grid", ""].map(Navigation.layoutOf)).toEqual(["sidebar", "topNav", "none", "sidebar", "sidebar"]);
  });
});
