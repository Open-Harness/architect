// Goal 6, slice 7: the app's Map tab (MAP-screens Q1 to Q3, decided by Aaron on 23 November 2026), written first and failing on `goal/portal`.
// The new client (`packages/portal-next`, built by this file's setup) is served over the blueprint `ortho generate` wrote for a copy of Plugged In
// (`generated/portal/blueprint.json`, handed to the portal's data API as it is), and opened in real Chromium at `/portal`: the app's own page.
//
// What a check expects is read from the project's generated files (`generated/app/map.json`, `generated/model/model.json`), never typed. The map
// has to reach the page through that same blueprint (K19: the portal reads the wire, not project source); how it sits in the wire is the builder's.
// Two apps: Plugged In with the fixture folders `good` and `scoped-ok` (a declared map: a chain of parents, three groups one folded, a page open
// to anyone, to a signed-in person and to a role, a page with a component) and Plugged In as it is (it declares none: the derived map). The app
// projection is mounted in both (the fixture `mount`).
//
// The hooks, which the builder gives (the frame's `data-portal` style); everything else a check reads is visible text and roles:
//   tabs      on `/portal`, two elements of role `tab` named exactly "Things" and "Map", side by side (Map right after Things). Selecting Things
//             shows `[data-portal=thing-card][data-thing]` (one per thing of the model) and none of the map; selecting Map shows the map.
//   `[data-portal=map]`           the Map tab's content. Every page and group below is visible once it is selected, nothing needs opening.
//   `[data-portal=map-tree]`      the pages as a tree by `parent`, holding `[data-portal=map-page][data-page=<name>]`, one per page. A page's
//                                 element sits inside its parent's element; a page with no parent (the home) sits in none. Each page's element
//                                 holds its own `[data-portal=map-select][data-page=<name>]`, the control that selects it, and shows its name.
//   `[data-portal=map-group]`     the navigation's groups, outside the tree: `data-group` its title, `data-folded` "true" or "false" as declared,
//                                 holding `[data-portal=map-group-page][data-page=<name>]` for each of its pages, in the declared order.
//   `[data-portal=map-detail]`    the selected page's detail, `data-page` its name; it holds the page's description as text, and
//                                 `map-route` (its text is the route as the map has it, `/@:handle/edit`, nothing more),
//                                 `map-allowed` (its text names who may open it: for each entry `anyone`, `signed in` or the role's full name,
//                                 and nothing of an entry the page does not have),
//                                 `map-show[data-name]` and `map-offer[data-name]`, one for each read it shows and operation it offers (the page's
//                                 effective lists, its components' included), and `map-component[data-name]`, one per component, each holding
//                                 the component's description. Items inside a `map-component` belong to it, and are not the page's.
//   `[data-portal=map-derived]`   present only when the app declared no map: its text says "derived, not declared" and where to declare one, `blueprint/app/`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Page } from "playwright";
import { appOf, buildClient, openApp, type App, type MapPage, type Opened } from "./support.ts";

const hook = (name: string, page?: string): string => `[data-portal="${name}"]${page === undefined ? "" : `[data-page="${page}"]`}`;
const ready = async (page: Page, selector: string): Promise<void> => {
  await page.waitForSelector(selector, { state: "visible", timeout: 8_000 }).catch(() => { throw new Error(`nothing visible matches ${selector}`); });
};
const openMap = async (page: Page): Promise<void> => {
  await page.getByRole("tab", { name: "Map", exact: true }).click({ timeout: 8_000 }).catch(() => { throw new Error("the app's page has no tab named Map"); });
  await ready(page, hook("map"));
};
const byName = <T extends { readonly name: string }>(items: ReadonlyArray<T>): ReadonlyArray<T> => [...items].sort((a, b) => (a.name < b.name ? -1 : 1));

/** The tree as drawn: each page with the page whose element it sits in, and whether it can be seen. */
const treeOf = (page: Page) => page.locator(`${hook("map-tree")} ${hook("map-page")}`).evaluateAll((els) => els.map((e) => ({
  name: e.getAttribute("data-page") ?? "", parent: e.parentElement?.closest('[data-portal="map-page"]')?.getAttribute("data-page") ?? null, visible: e.checkVisibility(),
})));
/** The groups as drawn, in document order. */
const groupsOf = (page: Page) => page.locator(hook("map-group")).evaluateAll((els) => els.map((e) => ({
  title: e.getAttribute("data-group") ?? "", folded: e.getAttribute("data-folded"), visible: e.checkVisibility(),
  pages: [...e.querySelectorAll('[data-portal="map-group-page"]')].map((p) => ({ page: p.getAttribute("data-page") ?? "", visible: p.checkVisibility() })),
})));
/** The detail as drawn. Items inside a component are the component's. */
const detailOf = (page: Page) => page.locator(hook("map-detail")).evaluate((el) => {
  const own = (name: string) => [...el.querySelectorAll(`[data-portal="${name}"]`)].filter((e) => e.closest('[data-portal="map-component"]') === null).map((e) => e.getAttribute("data-name") ?? "");
  return {
    page: el.getAttribute("data-page"), text: el.textContent ?? "", route: (el.querySelector('[data-portal="map-route"]')?.textContent ?? "").trim(),
    allowed: (el.querySelector('[data-portal="map-allowed"]')?.textContent ?? "").toLowerCase(), shows: own("map-show"), offers: own("map-offer"),
    components: [...el.querySelectorAll('[data-portal="map-component"]')].map((c) => ({ name: c.getAttribute("data-name") ?? "", text: c.textContent ?? "" })),
  };
});
const select = async (page: Page, name: string): Promise<void> => {
  await page.locator(hook("map-select", name)).click({ timeout: 8_000 }).catch(() => { throw new Error(`no control selects the page ${name}`); });
  await ready(page, `${hook("map-detail", name)}`);
};

/** Who may open a page, in the words the detail must use, and the words of what it must not say. */
const accessWords = (p: MapPage, every: ReadonlyArray<MapPage>) => {
  const kinds = (e: MapPage["allowed"][number]) => (e.kind === "role" ? (e.role ?? "").toLowerCase() : e.kind.replace(/-/g, " "));
  const has = new Set(p.allowed.map(kinds));
  const universe = new Set(every.flatMap((q) => q.allowed.map(kinds)).concat(["anyone", "signed in"]));
  return { must: [...has], mustNot: [...universe].filter((w) => !has.has(w)) };
};


const battery = (title: string, names: ReadonlyArray<string>, expectDeclared: boolean) => describe(title, () => {
  let app: App;
  let opened: Opened;
  const fresh = async (): Promise<Page> => { const page = await opened.home(); page.setDefaultTimeout(8_000); return page; };
  beforeAll(async () => {
    buildClient();
    app = appOf(names);
    expect(app.declared, "the fixture is the kind of app this suite says it is").toBe(expectDeclared);
    opened = await openApp(app);
  }, 900_000);
  afterAll(async () => { await opened?.close(); });

  it("the app's own page has a Map tab right after Things; Things still shows the thing cards and Map shows the map instead", async () => {
    const page = await fresh();
    const tabs = await page.getByRole("tab").allInnerTexts();
    const things_ = tabs.indexOf("Things");
    expect(things_, `the tabs are ${JSON.stringify(tabs)}`).toBeGreaterThanOrEqual(0);
    expect(tabs.indexOf("Map"), `Map sits beside Things; the tabs are ${JSON.stringify(tabs)}`).toBe(things_ + 1);
    await page.getByRole("tab", { name: "Things", exact: true }).click();
    await ready(page, hook("thing-card"));
    expect(await page.locator(hook("thing-card")).evaluateAll((els) => els.map((e) => e.getAttribute("data-thing")).sort())).toEqual(app.things);
    expect(await page.locator(hook("map")).count() === 0 || !(await page.locator(hook("map")).first().isVisible()), "the map is not shown under Things").toBe(true);
    await openMap(page);
    expect(await page.locator(hook("thing-card")).evaluateAll((els) => els.some((e) => e.checkVisibility())), "the thing cards are not shown under Map").toBe(false);
  }, 300_000);

  it("the pages are a tree by parent: every page once, inside its parent, the home inside none, all in view", async () => {
    const page = await fresh();
    await openMap(page);
    const drawn = await treeOf(page);
    expect(drawn.map((d) => d.name).sort(), "every page of the map once, and nothing else").toEqual(app.map.pages.map((p) => p.name).sort());
    expect(drawn.filter((d) => !d.visible).map((d) => d.name), "pages hidden until something is opened").toEqual([]);
    expect(byName(drawn.map((d) => ({ name: d.name, parent: d.parent }))), "each page sits inside its parent").toEqual(byName(app.map.pages.map((p) => ({ name: p.name, parent: p.parent ?? null }))));
  }, 300_000);

  it("the navigation's groups sit beside the tree: each title, whether it is folded, and its pages in order, none hidden", async () => {
    const page = await fresh();
    await openMap(page);
    const drawn = await groupsOf(page);
    expect(drawn.map((g) => ({ title: g.title, folded: g.folded, pages: g.pages.map((p) => p.page) }))).toEqual(
      app.map.groups.map((g) => ({ title: g.title, folded: String(g.folded), pages: g.pages.map((p) => p.page) })));
    expect(drawn.filter((g) => !g.visible || g.pages.some((p) => !p.visible)).map((g) => g.title), "groups or pages in them out of view").toEqual([]);
    expect(await page.locator(`${hook("map-tree")} ${hook("map-group")}`).count(), "groups are beside the tree, not inside it").toBe(0);
  }, 300_000);

  it("selecting a page shows its own detail: route, who may open it, what it shows and offers, its components", async () => {
    const page = await fresh();
    await openMap(page);
    // Last to first, so a page's detail is never the one before it by luck.
    for (const p of [...app.map.pages].reverse()) {
      await select(page, p.name);
      const d = await detailOf(page);
      const where = `the detail of ${p.name}`;
      expect(d.route, `${where}: its route`).toBe(p.path);
      expect(d.text, `${where}: its description`).toContain(p.description);
      const words = accessWords(p, app.map.pages);
      for (const w of words.must) expect(d.allowed, `${where}: who may open it names "${w}"`).toContain(w);
      for (const w of words.mustNot) expect(d.allowed, `${where}: who may open it does not name "${w}"`).not.toContain(w);
      expect([...d.shows].sort(), `${where}: what it shows`).toEqual([...p.shows].sort());
      expect([...d.offers].sort(), `${where}: what it offers`).toEqual([...p.offers].sort());
      expect(d.components.map((c) => c.name).sort(), `${where}: its components`).toEqual(p.components.map((c) => c.name).sort());
      for (const c of p.components) expect(d.components.find((x) => x.name === c.name)?.text, `${where}: the component ${c.name}'s description`).toContain(c.description);
    }
  }, 600_000);

  it(expectDeclared ? "a declared map is not marked derived, and its text says nothing of the kind" : "an app with no declared map shows the derived one, marked \"derived, not declared\", with how to declare one (blueprint/app/)", async () => {
    const page = await fresh();
    await openMap(page);
    const mark = page.locator(hook("map-derived"));
    const text = (await page.locator(hook("map")).textContent() ?? "").toLowerCase();
    if (expectDeclared) {
      expect(await mark.count(), "no derived mark").toBe(0);
      expect(text).not.toContain("derived, not declared");
      expect(text).not.toContain("blueprint/app/");
    } else {
      await ready(page, hook("map-derived"));
      expect(await mark.count(), "one mark").toBe(1);
      const said = ((await mark.textContent()) ?? "").toLowerCase();
      expect(said).toContain("derived, not declared");
      expect(said, "how to declare one").toContain("blueprint/app/");
    }
  }, 300_000);
});

battery("an app that declares its map (Plugged In with the fixtures good and scoped-ok)", ["good", "scoped-ok"], true);
battery("an app that declares none (Plugged In as it is)", [], false);
