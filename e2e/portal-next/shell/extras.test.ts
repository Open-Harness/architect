// Goal 6, slice 2: the shell's three run-time features (`MAP-shell` items 12 to 14; the portal builder's snags #665 and #666), written first and
// failing. Same fixture and hooks as shell.test.ts (its header is the rest of the contract); what it adds, which this file's tests hold the shell to:
//  `props.extra`   a source of palette rows the map cannot hold: `{ read(): ExtraEntry[]; subscribe(listener): unsubscribe }`, an `ExtraEntry` being
//                  `{ name, group, description?, allowed, href?, run? }`. `read` returns the same array until the rows change, and the shell re-reads
//                  when `subscribe`'s listener is called. The rows are listed after the map's own, under a heading per `group` (a `command-group-label`
//                  in UI SDK's own `command`), groups in the order they first appear and rows in the order given. A row is `[data-shell=palette-item]
//                  [data-kind=extra][data-group][data-name]`; two groups may share a name. Each row's `allowed` goes through the rule of the map's own
//                  entries with the caller and roles (no roles is none held), so a role-only row is hidden unless `roles` has it. `href` navigates and
//                  `run` calls the app; either closes the palette.
//  `props.notFound` a page function painted into the shell's 404 element, which keeps `data-shell=page`, `data-page=""` and `data-status=404`, and
//                  which names no portal hook (no `data-portal` anywhere): the shell knows no name an app marks itself ready with. Without it the
//                  shell's own "Page not found" stays. The body is painted again when the unmatched address changes.
//  the query       a page function's third argument is the address's `URLSearchParams`. The router still matches the pathname only, so a query never
//                  changes which page it is, and a change of query paints the page again.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Page } from "playwright";
import { repo } from "../map/support.ts";
import { serveFixture, shellDir, type Fixture } from "./support.ts";

let fx: Fixture;
const themeCss = (): string => {
  const from = createRequire(join(shellDir, "..", "theme", "package.json"));
  try { return from.resolve("@orthograph/theme/theme.css"); } catch {
    const env: NodeJS.ProcessEnv = { ...process.env, NX_DAEMON: "false" };
    delete env["HEROUI_AUTH_TOKEN"];
    spawnSync(join(repo, "node_modules/.bin/nx"), ["run", "theme:build", "--outputStyle=static"], { cwd: repo, env, encoding: "utf8", timeout: 240_000 });
    return from.resolve("@orthograph/theme/theme.css");
  }
};
beforeAll(async () => { fx = await serveFixture(() => [createRequire(import.meta.url).resolve("@ui-sdk/core/web.css"), themeCss()]); }, 900_000);
afterAll(async () => { await fx?.close(); });

const anyone = [{ kind: "anyone" }];
const owner = [{ kind: "role", role: "handle.handleOwner" }];
const ROWS = [
  { name: "alpha", group: "Things", description: "A thing", allowed: anyone, href: "/things/alpha" },
  { name: "beta", group: "Things", allowed: [{ kind: "signed-in" }], href: "/things/beta" },
  { name: "link", group: "Things", allowed: anyone, href: "/things/link" },
  { name: "HandleTaken", group: "Refusals", allowed: anyone, runs: true },
  { name: "link", group: "Refusals", allowed: anyone, runs: true },
  { name: "secret", group: "Refusals", allowed: owner, href: "/things/secret" },
];

const path = (page: Page) => new URL(page.url()).pathname + new URL(page.url()).search;
const palette = async (page: Page) => { await page.keyboard.press("Control+K"); await page.waitForSelector('[data-shell="palette"]'); };
/** The extra rows as drawn: `group/name`, in document order, with the heading each sits under. */
const extras = (page: Page): Promise<Array<{ group: string; name: string; heading: string | null }>> =>
  page.locator('[data-shell="palette-item"][data-kind="extra"]').evaluateAll((els) => els.map((e) => {
    let node: { parentElement: any; querySelector: (selector: string) => any } | null = e.parentElement;
    let heading: string | null = null;
    while (node !== null && heading === null) { heading = node.querySelector(':scope > [data-slot="command-group-label"]')?.textContent ?? null; node = node.parentElement; }
    return { group: e.getAttribute("data-group") ?? "", name: e.getAttribute("data-name") ?? "", heading };
  }));
const keys = async (page: Page) => (await extras(page)).map((e) => `${e.group}/${e.name}`);

describe("extra palette rows", () => {
  it("are listed after the map's rows, under a heading per group in the order the groups first appear", async () => {
    const page = await fx.open("/@aaron", { caller: "person", roles: ["handle.handleOwner"], extras: ROWS });
    await palette(page);
    const all = await page.locator('[data-shell="palette-item"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
    const firstExtra = all.indexOf("extra");
    expect(firstExtra).toBeGreaterThan(0);
    expect(all.slice(firstExtra).every((k) => k === "extra"), "the map's rows all come first").toBe(true);
    expect(await extras(page)).toEqual([
      { group: "Things", name: "alpha", heading: "Things" }, { group: "Things", name: "beta", heading: "Things" }, { group: "Things", name: "link", heading: "Things" },
      { group: "Refusals", name: "HandleTaken", heading: "Refusals" }, { group: "Refusals", name: "link", heading: "Refusals" }, { group: "Refusals", name: "secret", heading: "Refusals" },
    ]);
  }, 300_000);

  it("go through the caller-and-roles rule: a role-only row is hidden unless the caller holds the role; an anonymous caller holds none", async () => {
    const seen = async (caller: "anonymous" | "person", roles: ReadonlyArray<string>) => { const page = await fx.open("/", { caller, roles, extras: ROWS }); await palette(page); return keys(page); };
    expect(await seen("person", ["handle.handleOwner"])).toEqual(["Things/alpha", "Things/beta", "Things/link", "Refusals/HandleTaken", "Refusals/link", "Refusals/secret"]);
    expect(await seen("person", [])).toEqual(["Things/alpha", "Things/beta", "Things/link", "Refusals/HandleTaken", "Refusals/link"]);
    expect(await seen("person", ["link.linkOwner"])).toEqual(["Things/alpha", "Things/beta", "Things/link", "Refusals/HandleTaken", "Refusals/link"]);
    expect(await seen("anonymous", ["handle.handleOwner"])).toEqual(["Things/alpha", "Things/link", "Refusals/HandleTaken", "Refusals/link"]);
  }, 300_000);

  it("a row with an href navigates, a row with a run calls the app, and either closes the palette", async () => {
    const page = await fx.open("/", { caller: "person", extras: ROWS });
    await palette(page);
    await page.locator('[data-shell="palette-item"][data-kind="extra"][data-group="Things"][data-name="alpha"]').click();
    await page.waitForSelector('[data-fixture-page="thing"]');
    expect(path(page)).toBe("/things/alpha");
    expect(await page.locator('[data-shell="palette"]').count()).toBe(0);
    await palette(page);
    await page.locator('[data-shell="palette-item"][data-kind="extra"][data-group="Refusals"][data-name="link"]').click();
    expect(await page.evaluate("globalThis.__ran")).toEqual(["link"]);
    expect(path(page), "a run moves nowhere").toBe("/things/alpha");
    expect(await page.locator('[data-shell="palette"]').count()).toBe(0);
  }, 300_000);

  it("a name in two groups is two rows, each its own", async () => {
    const page = await fx.open("/", { caller: "person", extras: ROWS });
    await palette(page);
    expect((await keys(page)).filter((k) => k.endsWith("/link"))).toEqual(["Things/link", "Refusals/link"]);
    await page.locator('[data-shell="palette-item"][data-group="Things"][data-name="link"]').click();
    await page.waitForSelector('[data-fixture-page="thing"]');
    expect(path(page)).toBe("/things/link");
    expect(await page.evaluate("globalThis.__ran"), "the other group's `link` was not run").toEqual([]);
  }, 300_000);

  it("follow the source: the shell re-reads when subscribe's listener is called, with the palette open", async () => {
    const page = await fx.open("/", { caller: "person", roles: [], extras: ROWS.slice(0, 1) });
    await palette(page);
    expect(await keys(page)).toEqual(["Things/alpha"]);
    await page.evaluate(`globalThis.__setExtra(${JSON.stringify([...ROWS.slice(0, 1), { name: "gamma", group: "Things", allowed: anyone, href: "/things/gamma" }, { name: "late", group: "Fresh", allowed: anyone, href: "/things/late" }, { name: "secret", group: "Fresh", allowed: owner }])})`);
    await page.waitForFunction(`document.querySelectorAll('[data-kind="extra"]').length === 3`);
    expect(await extras(page)).toEqual([
      { group: "Things", name: "alpha", heading: "Things" }, { group: "Things", name: "gamma", heading: "Things" }, { group: "Fresh", name: "late", heading: "Fresh" },
    ]);
    await page.evaluate("globalThis.__setExtra([])");
    await page.waitForFunction(`document.querySelectorAll('[data-kind="extra"]').length === 0`);
    expect(await extras(page)).toEqual([]);
  }, 300_000);
});

describe("the app's own 404", () => {
  it("is painted into the shell's 404 element, which keeps its hooks and names no portal hook", async () => {
    const page = await fx.open("/nowhere", { notFound: true });
    const el = page.locator('[data-shell="page"]');
    expect(await el.getAttribute("data-status")).toBe("404");
    expect(await el.getAttribute("data-page")).toBe("");
    expect(await el.locator("[data-fixture-404]").count()).toBe(1);
    expect(await el.innerText()).not.toContain("Page not found");
    expect(await page.locator("[data-portal]").count()).toBe(0);
    expect(await page.locator("[data-fixture-page]").count()).toBe(0);
  }, 300_000);

  it("without one, the shell says so itself", async () => {
    const page = await fx.open("/nowhere");
    expect(await page.locator('[data-shell="page"]').innerText()).toContain("Page not found");
    expect(await page.locator("[data-fixture-404]").count()).toBe(0);
  }, 300_000);

  it("is painted again when the unmatched address changes, and gives way to a page when the address matches", async () => {
    const page = await fx.open("/nowhere", { notFound: true });
    expect(await page.locator("[data-fixture-404-path]").innerText()).toBe("/nowhere");
    await page.evaluate("globalThis.__shell.navigate('/elsewhere?x=1')");
    await page.waitForFunction(`document.querySelector("[data-fixture-404-path]")?.textContent === "/elsewhere?x=1"`);
    expect(await page.locator('[data-shell="page"]').getAttribute("data-status")).toBe("404");
    await page.evaluate("globalThis.__shell.navigate('/account')");
    await page.waitForSelector('[data-fixture-page="account"]');
    expect(await page.locator('[data-shell="page"]').getAttribute("data-status")).toBe("200");
    expect(await page.locator("[data-fixture-404]").count()).toBe(0);
    await page.goBack();
    await page.waitForSelector("[data-fixture-404]");
    expect(await page.locator('[data-shell="page"]').getAttribute("data-status")).toBe("404");
  }, 300_000);
});

describe("a page reading the query", () => {
  const read = (page: Page) => page.evaluate(`({ page: document.querySelector('[data-shell="page"]').getAttribute("data-page"), tab: document.querySelector("[data-fixture-tab]").textContent, search: document.querySelector("[data-fixture-search]").textContent, paints: Number(document.querySelector("[data-fixture-paints]").textContent) })`) as Promise<{ page: string; tab: string; search: string; paints: number }>;

  it("gets the address's URLSearchParams as its third argument", async () => {
    const page = await fx.open("/@aaron?tab=links&x=1");
    expect(await read(page)).toMatchObject({ page: "profile", tab: "links", search: "tab=links&x=1" });
    expect(await read(await fx.open("/@aaron"))).toMatchObject({ tab: "", search: "" });
  }, 300_000);

  it("is painted again when the query changes, and the query never changes which page it is", async () => {
    const page = await fx.open("/@aaron?tab=links");
    const first = await read(page);
    await page.evaluate("globalThis.__shell.navigate('/@aaron?tab=docs')");
    await page.waitForFunction(`document.querySelector("[data-fixture-tab]")?.textContent === "docs"`);
    const second = await read(page);
    expect(second).toMatchObject({ page: "profile", tab: "docs", search: "tab=docs" });
    expect(second.paints).toBeGreaterThan(first.paints);
    expect(await page.locator('[data-shell="breadcrumb"] [data-shell="crumb"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-page")))).toEqual(["home", "profile"]);
    await page.goBack();
    await page.waitForFunction(`document.querySelector("[data-fixture-tab]")?.textContent === "links"`);
    expect(path(page)).toBe("/@aaron?tab=links");
    await page.goForward();
    await page.waitForFunction(`document.querySelector("[data-fixture-tab]")?.textContent === "docs"`);
  }, 300_000);

  it("is not repainted by a navigation that changes nothing a page read", async () => {
    const page = await fx.open("/@aaron?tab=links");
    const before = (await read(page)).paints;
    await page.evaluate("globalThis.__shell.navigate('/@aaron?tab=links')");
    await page.waitForTimeout(300);
    expect((await read(page)).paints, "the same address paints nothing again").toBe(before);
  }, 300_000);
});
