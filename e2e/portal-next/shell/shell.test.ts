// Goal 6, slice 2: the shell's checks (slice 5; K31 sections 3 and 4), written first and failing. `@orthograph/shell` is mounted in a fixture app
// in Chromium over the generated app data of a declared map (`fixtures/good`, mounted: the real compiler and projection make the data), and
// read as a person reads it, by `data-shell` hooks, and as an agent reads it, by `snapshot()`.
//
// THE CONTRACT slice 5 meets (K31 leaves it open, so this file chooses):
//  Package `@orthograph/shell` at `packages/shell/`, its root export resolved through its `exports` (a `default` condition) from the package's own
//    folder. It depends on `@ui-sdk/react` at 0.1.0-beta.10 and on no router (no react-router, @tanstack/*router, wouter, navigo) and no HeroUI.
//  `mountShell(root: HTMLElement, props): { agent, unmount(), navigate(path) }`, framework-free to call. `props`:
//    routes, navigation, map   the contents of generated/app/routes.json, navigation.json and map.json, as they are
//    palette                   `entries` of generated/app/palette.json
//    caller                    "anonymous" | "person": what the palette lists (the rule in map/projection.test.ts: a page when its `allowed` has
//                              `anyone` (anonymous) or anything (a person); an operation when its page is and its own `allowed` passes)
//    pages                     { [page name]: (el: HTMLElement, params: Record<string, string>) => void | (() => void) }: a page paints itself
//                              into the element the shell gives it (the look is the page's own code, K31 section 2); params are decoded
//    slots                     { header?, switcher?, footer?, actions? }: each the same kind of function; `nav` is the shell's own
//    `agent` is the UI SDK bridge (`createAgent` of `@ui-sdk/react/agent`) the shell made once; `navigate` is the router's own push.
//  The router is a small runtime over the route table and the History API: a route is its path with `:name` parameters, a segment match, no
//    regular expressions the app can reach; a path that matches none is the 404 page of the shell, never a blank. Browser back and forward work.
//  Hooks, as attributes (UI SDK keeps `data-slot` for itself, so the shell's are `data-shell`):
//    [data-shell=root][data-layout]                       the layout in force: sidebar | topNav | none
//    [data-shell=sidebar] | [data-shell=topbar]           the region that holds the navigation, by layout; `none` has neither
//    [data-shell=slot][data-shell-slot=header|switcher|nav|footer|actions]   a slot's region; `none` draws no slot
//    [data-shell=nav]                                     the navigation, holding [data-shell=nav-group][data-title][data-folded=true|false]
//                                                         with [data-shell=nav-item][data-page][data-current=true|false] in the group's order
//    [data-shell=breadcrumb] > [data-shell=crumb][data-page][data-current]   the chain of parents from home to the page, links where it can
//    [data-shell=page][data-page][data-status]            the page body's element: status 200, or 404 with data-page=""
//    [data-shell=palette] > [data-shell=palette-item][data-kind=page|operation][data-name][data-page]   open on Meta+K or Control+K, closed on Escape
//  A nav item is a link (an `a` with `href`) when its route's parameters are all in the current route's, resolved with them, else not a link and
//    `aria-disabled=true`. The item's visible text and agent label is the page's name; a group's is its title; the current page's item has
//    `aria-current=page`. A folded group starts closed (its items hidden) and opens on its trigger, even when the current page is one of its
//    pages; a group that is not folded starts open.
//  The palette lists the pages the caller may open, and the operations it may call on the page it is on (K31 section 4), each by its name, in
//    `palette.json`'s order (the pages by name, then the operations by page, then name). It opens on Meta+K and on Control+K.
//  On UI SDK, and as the bridge reads it (the shell's `agent` is the `createAgent` of `@ui-sdk/react/agent`, made once, over these components):
//    the navigation is a `navigation-menu` labelled `Main`, inside a `scroll-area` labelled `Navigation` (give it an `aria-label`: an unnamed
//    entry fails the every-entry-is-named rule of UI SDK's agent-ready checklist); each group is a `collapsible` labelled with its title (trigger
//    and panel); the palette is a `command` labelled `Search` whose rows are `command-item`s, present only while it is open. The bridge lists
//    the nav links and the palette rows as the `items` of the `navigation-menu` and `command` entries (each by its visible text), and a closed
//    folded group's links only once it is open (`act` a `setOpen` on the group's `ref`, its title, opens it: its panel is not `keepMounted`, so a
//    closed one has no links in the page or the bridge). A page that is no link on this route (its parameters are not in the route) is no item.
//    The bridge cannot follow a navigation-menu link (`navigation-menu` has only `setValue` and `close`), so a link is judged by what the bridge
//    reads (an item of `Main`, by `query({ within: "Main" })`) and by being a real link to its route. An agent moves by the palette: `act` steps
//    `setValue` of a row's name then `run`, both on `Search`, select the row (its `onSelect` navigates and closes the palette).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Page } from "playwright";
import { repo } from "../map/support.ts";
import { serveFixture, shellDir, shellEntry, type Fixture } from "./support.ts";

let fx: Fixture;
const themeCss = (): string => {
  const from = createRequire(join(shellDir, "..", "theme", "package.json"));
  try { return from.resolve("@orthograph/theme/theme.css"); } catch {
    // The stylesheet may be a build output: build the theme, as its own check does, with no HeroUI token.
    const env: NodeJS.ProcessEnv = { ...process.env, NX_DAEMON: "false" };
    delete env["HEROUI_AUTH_TOKEN"];
    spawnSync(join(repo, "node_modules/.bin/nx"), ["run", "theme:build", "--outputStyle=static"], { cwd: repo, env, encoding: "utf8", timeout: 240_000 });
    return from.resolve("@orthograph/theme/theme.css");
  }
};
const styles = (): ReadonlyArray<string> => [createRequire(import.meta.url).resolve("@ui-sdk/core/web.css"), themeCss()];
beforeAll(async () => { fx = await serveFixture(styles); }, 900_000);
afterAll(async () => { await fx?.close(); });

const text = (page: Page, selector: string) => page.locator(selector).allTextContents();
const attrs = (page: Page, selector: string, name: string): Promise<Array<string | null>> => page.locator(selector).evaluateAll((els, n) => els.map((e) => e.getAttribute(n)), name);
const body = async (page: Page) => ({ page: await page.locator('[data-shell="page"]').first().getAttribute("data-page"), status: await page.locator('[data-shell="page"]').first().getAttribute("data-status"), params: JSON.parse((await text(page, "[data-fixture-params]"))[0] ?? "null") as unknown });
const path = (page: Page) => new URL(page.url()).pathname;
const names = (page: Page, kind: string) => attrs(page, `[data-shell="palette-item"][data-kind="${kind}"]`, "data-name");

describe("the package", () => {
  it("resolves through its exports, and names no HeroUI and no router", () => {
    shellEntry();
    const pkg = JSON.parse(readFileSync(join(shellDir, "package.json"), "utf8")) as { dependencies?: Record<string, string>; peerDependencies?: Record<string, string> };
    const deps = { ...pkg.peerDependencies, ...pkg.dependencies };
    expect(deps["@ui-sdk/react"]).toBe("0.1.0-beta.10");
    expect(Object.keys(deps).filter((d) => /react-router|@tanstack\/(react-)?router|wouter|navigo|heroui/.test(d))).toEqual([]);
    const files = (folder: string): string[] => readdirSync(folder, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" ? [] : e.isDirectory() ? files(join(folder, e.name)) : [join(folder, e.name)]));
    expect(files(shellDir).filter((f) => /@heroui|--heroui/i.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});

describe("the router", () => {
  it("resolves a typed route to its page, with its parameters decoded", async () => {
    for (const [route, expected] of [["/", { page: "home", params: {} }], ["/account", { page: "account", params: {} }], ["/@aaron", { page: "profile", params: { handle: "aaron" } }], ["/@a%20b/edit", { page: "edit", params: { handle: "a b" } }], ["/things/handle", { page: "thing", params: { name: "handle" } }]] as const) {
      const page = await fx.open(route);
      expect(await body(page), route).toEqual({ ...expected, status: "200" });
    }
  }, 300_000);

  it("answers a path that is no route with the 404 page", async () => {
    for (const route of ["/nowhere", "/@aaron/edit/extra", "/things", "/account/x"]) {
      const page = await fx.open(route);
      expect(await attrs(page, '[data-shell="page"]', "data-status"), route).toEqual(["404"]);
      expect(await attrs(page, '[data-shell="page"]', "data-page"), route).toEqual([""]);
      expect(await page.locator("[data-fixture-page]").count(), route).toBe(0);
    }
  }, 300_000);

  it("moves between pages without reloading, and back and forward restore them", async () => {
    const page = await fx.open("/");
    await page.evaluate("globalThis.__mark = 'kept'");
    await page.locator('[data-shell="nav-group"][data-title="Settings"] [data-slot="collapsible-trigger"]').click();
    await page.locator('[data-shell="nav-item"][data-page="account"] a, a[data-shell="nav-item"][data-page="account"]').first().click();
    await page.waitForSelector('[data-fixture-page="account"]');
    expect(path(page)).toBe("/account");
    await page.goBack();
    await page.waitForSelector('[data-fixture-page="home"]');
    expect(path(page)).toBe("/");
    await page.goForward();
    await page.waitForSelector('[data-fixture-page="account"]');
    expect(await page.evaluate("globalThis.__mark")).toBe("kept");
  }, 300_000);
});

describe("the layouts and their slots", () => {
  for (const layout of ["sidebar", "topNav"] as const) {
    it(`${layout}: the navigation in its region, the slots filled, the page in the middle`, async () => {
      const page = await fx.open("/account", { layout });
      expect(await attrs(page, '[data-shell="root"]', "data-layout")).toEqual([layout]);
      const [here, other] = layout === "sidebar" ? ["sidebar", "topbar"] : ["topbar", "sidebar"];
      expect(await page.locator(`[data-shell="${here}"] [data-shell="nav"]`).count()).toBe(1);
      expect(await page.locator(`[data-shell="${other}"]`).count()).toBe(0);
      for (const slot of ["header", "switcher", "footer", "actions"]) expect(await text(page, `[data-shell="slot"][data-shell-slot="${slot}"]`), slot).toEqual([`slot-${slot}`]);
      expect(await page.locator('[data-shell="slot"][data-shell-slot="nav"] [data-shell="nav"]').count()).toBe(1);
      expect(await page.locator('[data-shell="page"] [data-fixture-page="account"]').count()).toBe(1);
    }, 300_000);
  }
  it("none: only the page", async () => {
    const page = await fx.open("/account", { layout: "none" });
    expect(await attrs(page, '[data-shell="root"]', "data-layout")).toEqual(["none"]);
    for (const hook of ["sidebar", "topbar", "nav", "slot", "breadcrumb"]) expect(await page.locator(`[data-shell="${hook}"]`).count(), hook).toBe(0);
    expect(await page.locator('[data-fixture-page="account"]').count()).toBe(1);
  }, 300_000);
  it("an empty slot is drawn empty, not filled with anything of the shell's", async () => {
    const page = await fx.open("/account", { slots: false });
    for (const slot of ["header", "switcher", "footer", "actions"]) expect((await text(page, `[data-shell-slot="${slot}"]`)).join("").trim(), slot).toBe("");
  }, 300_000);
});

describe("the navigation", () => {
  it("lists the groups as declared, each page by its name, and folds a folded group", async () => {
    const page = await fx.open("/account");
    expect(await attrs(page, '[data-shell="nav-group"]', "data-title")).toEqual(["Your page", "Settings", "Things"]);
    expect(await attrs(page, '[data-shell="nav-group"]', "data-folded")).toEqual(["false", "true", "false"]);
    // A closed folded group's panel is not mounted (no `keepMounted`), so its items are in the page only once it is open; where a build keeps them, they are hidden.
    expect((await attrs(page, '[data-shell="nav-item"]', "data-page")).filter((n) => n !== "account")).toEqual(["profile", "edit", "thing"]);
    expect(await text(page, '[data-shell="nav-item"]:not([data-page="account"])')).toEqual(["profile", "edit", "thing"].map((n) => expect.stringContaining(n)));
    expect(await page.locator('[data-shell="nav-item"][data-page="account"]').first().isVisible()).toBe(false);
    expect(await page.locator('[data-shell="nav-item"][data-page="profile"]').first().isVisible()).toBe(true);
    await page.locator('[data-shell="nav-group"][data-title="Settings"] [data-slot="collapsible-trigger"]').click();
    expect(await page.locator('[data-shell="nav-item"][data-page="account"]').first().isVisible()).toBe(true);
  }, 300_000);

  it("a page with parameters is a link only where the route has them; the current page is marked", async () => {
    const root = await fx.open("/");
    const item = (page: Page, name: string) => page.locator(`[data-shell="nav-item"][data-page="${name}"]`).first();
    expect(await attrs(root, '[data-shell="nav-item"][data-page="profile"]', "aria-disabled")).toEqual(["true"]);
    expect(await attrs(root, '[data-shell="nav-item"][data-page="profile"] a, a[data-shell="nav-item"][data-page="profile"]', "href")).toEqual([]);
    const profile = await fx.open("/@aaron");
    expect(await attrs(profile, '[data-shell="nav-item"][data-page="edit"] a, a[data-shell="nav-item"][data-page="edit"]', "href")).toEqual(["/@aaron/edit"]);
    expect(await item(profile, "profile").getAttribute("aria-current")).toBe("page");
    expect(await item(profile, "edit").getAttribute("aria-current")).toBeNull();
    const current = await profile.locator('[data-shell="nav-item"]').evaluateAll((els) => els.map((e) => [e.getAttribute("data-page"), e.getAttribute("data-current")]));
    expect(current).toEqual([["profile", "true"], ["edit", "false"], ["thing", "false"]]);
  }, 300_000);
});

describe("the breadcrumb", () => {
  it("is the chain of parents, home first, the page last and current, linked with the route's parameters", async () => {
    const edit = await fx.open("/@aaron/edit");
    expect(await attrs(edit, '[data-shell="crumb"]', "data-page")).toEqual(["home", "profile", "edit"]);
    expect(await attrs(edit, '[data-shell="crumb"]', "data-current")).toEqual(["false", "false", "true"]);
    expect(await attrs(edit, '[data-shell="crumb"] a, a[data-shell="crumb"]', "href")).toEqual(["/", "/@aaron"]);
    expect(await attrs(await fx.open("/"), '[data-shell="crumb"]', "data-page")).toEqual(["home"]);
    expect(await attrs(await fx.open("/account"), '[data-shell="crumb"]', "data-page")).toEqual(["home", "account"]);
  }, 300_000);
});

describe("the palette", () => {
  const palette = async (route: string, caller: "anonymous" | "person") => {
    const page = await fx.open(route, { caller });
    await page.keyboard.press("Control+K");
    await page.waitForSelector('[data-shell="palette"]');
    return page;
  };
  it("lists the pages a person may open, and the operations they may call on the page they are on", async () => {
    const page = await palette("/@aaron", "person");
    expect(await names(page, "page")).toEqual(["account", "edit", "home", "profile", "thing"]);
    expect(await names(page, "operation")).toEqual(["handle.release", "link.add"]);
    expect(await attrs(page, '[data-shell="palette-item"][data-kind="operation"]', "data-page")).toEqual(["profile", "profile"]);
    expect(await names(await palette("/", "person"), "operation")).toEqual(["handle.claim"]);
  }, 300_000);
  it("lists only what an anonymous caller may open and call", async () => {
    const page = await palette("/@aaron", "anonymous");
    expect(await names(page, "page")).toEqual(["home", "profile", "thing"]);
    expect(await names(page, "operation")).toEqual([]);
  }, 300_000);
  it("opens a page from its row, and closes on Escape", async () => {
    const page = await palette("/", "person");
    await page.locator('[data-shell="palette-item"][data-kind="page"][data-name="account"]').click();
    await page.waitForSelector('[data-fixture-page="account"]');
    expect(path(page)).toBe("/account");
    await page.keyboard.press("Control+K");
    await page.waitForSelector('[data-shell="palette"]');
    await page.keyboard.press("Escape");
    expect(await page.locator('[data-shell="palette"]').count()).toBe(0);
  }, 300_000);
});

describe("on UI SDK, and readable by an agent", () => {
  type Entry = { component: string; ref: string; label?: string; offPage?: boolean; items?: Array<{ value?: string; label?: string }> };
  const snapshot = async (page: Page): Promise<Entry[]> => (await page.evaluate("globalThis.__shell.agent.snapshot().filter((e) => !e.offPage)")) as Entry[];
  /** Every name the bridge gives: an entry's label, and the labels of its items (a link of the navigation, a row of the palette). */
  const named = (entries: ReadonlyArray<Entry>): string[] => entries.flatMap((e) => [e.label ?? "", ...(e.items ?? []).map((i) => i.label ?? "")]);
  const labelsIn = (value: unknown): string[] => (Array.isArray(value) ? value.flatMap(labelsIn) : typeof value === "object" && value !== null ? Object.entries(value).flatMap(([k, v]) => (k === "label" && typeof v === "string" ? [v] : labelsIn(v))) : []);
  /** One `act` of steps, in the one form the bridge takes: `ok` is not the effect (UI SDK's own checklist says so), so the tests read the page after. */
  const act = async (page: Page, steps: ReadonlyArray<object>) => {
    const result = (await page.evaluate(`globalThis.__shell.agent.act({ steps: ${JSON.stringify(steps)} })`)) as { ok: boolean; error?: { message?: string } };
    expect(result.ok, result.error?.message ?? JSON.stringify(steps)).toBe(true);
    return result;
  };

  it("draws the navigation and the palette with UI SDK's own components: the bridge lists them by their component names", async () => {
    const page = await fx.open("/@aaron");
    const entries = await snapshot(page);
    expect(entries.filter((e) => e.component === "navigation-menu").map((e) => e.label)).toEqual(["Main"]);
    expect(entries.filter((e) => e.component === "collapsible").map((e) => e.label)).toEqual(["Your page", "Settings", "Things"]);
    expect(entries.filter((e) => e.component === "scroll-area").map((e) => e.label)).toEqual(["Navigation"]);
    expect(entries.filter((e) => e.component === "command")).toEqual([]);
    await page.keyboard.press("Meta+K");
    await page.waitForSelector('[data-shell="palette"]');
    expect((await snapshot(page)).filter((e) => e.component === "command").map((e) => e.label)).toEqual(["Search"]);
    expect(await page.locator('[data-slot="command"] [data-slot="command-item"]').count()).toBe(await page.locator('[data-shell="palette-item"]').count());
  }, 300_000);

  it("an agent finds the navigation by name: the groups, and the links of the open ones through the bridge's query", async () => {
    const page = await fx.open("/@aaron");
    const before = named(await snapshot(page));
    // The bridge lists a link, not a page that is no link here: `thing` needs a `name` this route does not have, so it is not an item.
    for (const name of ["Main", "Your page", "Settings", "Things", "profile", "edit"]) expect(before, name).toContain(name);
    expect(before, "a closed folded group lists its links only once it is open").not.toContain("account");
    expect(before, "a page that is no link here is no item of the navigation").not.toContain("thing");
    expect(labelsIn(await page.evaluate('globalThis.__shell.agent.query({ within: "Main" })'))).toEqual(expect.arrayContaining(["profile", "edit"]));
    await act(page, [{ ref: "Settings", action: "setOpen", args: [true] }]);
    expect(await page.locator('[data-shell="nav-item"][data-page="account"]').first().isVisible()).toBe(true);
    expect(named(await snapshot(page))).toContain("account");
    expect(labelsIn(await page.evaluate('globalThis.__shell.agent.query({ within: "Main" })'))).toContain("account");
  }, 300_000);

  it("an agent follows the navigation's links to where they go, and moves with the palette's `run`, and the page follows", async () => {
    const page = await fx.open("/@aaron");
    // The bridge has no action that follows a navigation-menu link (`navigation-menu` offers `setValue` and `close`; a link is not pressable), so a
    // link is judged by what the bridge reads of it and where it goes: an item of "Main", and a real link to its route.
    await act(page, [{ ref: "Settings", action: "setOpen", args: [true] }]);
    const items = (await page.evaluate('globalThis.__shell.agent.query({ within: "Main" })')) as Array<{ items?: Array<{ value?: string; label?: string }> }>;
    expect(items.flatMap((e) => e.items ?? []).map((i) => i.value)).toEqual(expect.arrayContaining(["profile", "edit", "account"]));
    expect(await attrs(page, 'a[data-shell="nav-item"][data-page="account"], [data-shell="nav-item"][data-page="account"] a', "href")).toEqual(["/account"]);
    // The move by agent is the palette's: `setValue` highlights a row, `run` selects it (the row's `onSelect` is the navigation).
    await page.keyboard.press("Control+K");
    await page.waitForSelector('[data-shell="palette"]');
    expect(named(await snapshot(page))).toEqual(expect.arrayContaining(["Search", "home", "account"]));
    await act(page, [{ ref: "Search", action: "setValue", args: ["account"] }, { ref: "Search", action: "run" }]);
    await page.waitForSelector('[data-fixture-page="account"]');
    expect(path(page)).toBe("/account");
    expect(await page.locator('[data-shell="palette"]').count(), "a run closes the palette").toBe(0);
    await page.keyboard.press("Control+K");
    await page.waitForSelector('[data-shell="palette"]');
    await act(page, [{ ref: "Search", action: "setValue", args: ["home"] }, { ref: "Search", action: "run" }]);
    await page.waitForSelector('[data-fixture-page="home"]');
    expect(path(page)).toBe("/");
  }, 300_000);

  it("lists the palette's operations by name on the page they belong to, and every entry and item has a name", async () => {
    const page = await fx.open("/@aaron");
    await page.keyboard.press("Control+K");
    await page.waitForSelector('[data-shell="palette"]');
    const entries = await snapshot(page);
    for (const name of ["handle.release", "link.add", "home", "account"]) expect(named(entries), name).toContain(name);
    for (const e of entries.filter((x) => x.component !== "more")) {
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy();
      for (const item of e.items ?? []) expect(item.label, `an item of ${e.component} ${e.label ?? ""} has no name`).toBeTruthy();
    }
  }, 300_000);
});
