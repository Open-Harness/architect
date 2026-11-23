// The frame, rendered on the server: the hooks a person and a selector read, for each layout. The behaviours that need a browser (focus, the
// palette's keys, the bridge) are `e2e/portal-next/shell`'s, in Chromium.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { History } from "../history/types.ts";
import { Frame } from "./service.ts";
import type { ShellProps } from "./types.ts";

const props: ShellProps = {
  routes: {
    routes: [
      { page: "account", path: "/account", params: [], parent: "home" },
      { page: "edit", path: "/@:handle/edit", params: ["handle"], parent: "profile" },
      { page: "home", path: "/", params: [] },
      { page: "profile", path: "/@:handle", params: ["handle"], parent: "home" },
    ],
  },
  navigation: {
    layout: "sidebar",
    home: "home",
    groups: [
      { title: "Your page", folded: false, pages: [{ page: "profile", path: "/@:handle" }, { page: "edit", path: "/@:handle/edit" }] },
      { title: "Settings", folded: true, pages: [{ page: "account", path: "/account" }] },
    ],
  },
  map: { home: "home" },
  palette: [],
  caller: "person",
  pages: {},
  slots: { header: () => undefined },
};
const at = (path: string, search = ""): History => ({ path: () => path, search: () => search, push: () => undefined, subscribe: () => () => undefined });
const render = (path: string, layout = "sidebar") =>
  renderToStaticMarkup(createElement(Frame.Shell, { props: { ...props, navigation: { ...props.navigation, layout } }, history: at(path) }));
const count = (html: string, pattern: string): number => html.split(pattern).length - 1;

describe("the layouts", () => {
  it("draws the sidebar with the navigation in it, and no top bar", () => {
    const html = render("/@aaron");
    expect(html).toContain('data-layout="sidebar"');
    expect(count(html, 'data-shell="sidebar"')).toBe(1);
    expect(count(html, 'data-shell="topbar"')).toBe(0);
    expect(count(html, 'data-shell-slot="nav"')).toBe(1);
  });

  it("draws the top bar for topNav, and only the page for none", () => {
    expect(count(render("/@aaron", "topNav"), 'data-shell="topbar"')).toBe(1);
    const none = render("/account", "none");
    for (const hook of ['data-shell="sidebar"', 'data-shell="topbar"', 'data-shell="slot"', 'data-shell="nav"', 'data-shell="breadcrumb"']) expect(count(none, hook), hook).toBe(0);
    expect(count(none, 'data-shell="page"')).toBe(1);
  });
});

describe("the navigation and the breadcrumb", () => {
  it("makes a page a link only where the route has its parameters, and marks the one shown", () => {
    const html = render("/@aaron");
    expect(html).toContain('href="/@aaron/edit"');
    expect(html).toContain('aria-current="page"');
    expect(render("/account")).toContain('aria-disabled="true"');
  });

  it("starts a folded group closed, so its pages are not in the page", () => {
    expect(render("/account")).not.toContain('data-page="account" data-shell="nav-item"');
    expect(count(render("/account"), 'data-shell="nav-item"')).toBe(2);
  });

  it("draws the chain of parents, the page last", () => {
    const html = render("/@aaron/edit");
    expect([...html.matchAll(/data-shell="crumb" data-page="(\w+)" data-current="(\w+)"/g)].map((m) => [m[1], m[2]])).toEqual([["home", "false"], ["profile", "false"], ["edit", "true"]]);
  });
});

describe("the app's own 404", () => {
  const html = renderToStaticMarkup(createElement(Frame.Shell, { props: { ...props, notFound: () => undefined }, history: at("/nowhere") }));
  it("keeps the shell's hooks and leaves the body to the app", () => {
    expect(html).toContain('data-page="" data-status="404"');
    expect(html).not.toContain("Page not found");
  });
});

describe("the 404", () => {
  it("is the shell's own page, with no name, and never a blank", () => {
    const html = render("/nowhere");
    expect(html).toContain('data-page="" data-status="404"');
    expect(html).toContain("Page not found");
  });
});
