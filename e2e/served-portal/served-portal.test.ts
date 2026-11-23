// The instrument's own controls: with a stand-in client (a page that draws itself in the browser from `/_portal/v1/blueprint`) and a
// stand-in server, the harness serves the shell at `/portal`, renders in Chromium, reads the hooks off the rendered DOM, tells a
// page's 404 from its own, hands back what the browser fetched, takes the same screenshot twice, and says K19 when a half is missing.
// These pass today; they judge the harness, not the portal.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ServedPortals } from "./service.ts";
import { CLOCK_ISO, ServedPortalUnavailable, type PortalServerModule } from "./types.ts";

const SHELL = `<!doctype html><html><head><meta charset="utf-8"><title>stand-in</title></head><body><div id="root">loading</div><script>
const route = location.pathname.replace(/^\\/portal/, "") || "/";
fetch("/_portal/v1/blueprint").then((r) => r.json()).then((blueprint) => {
  const missing = route.startsWith("/nowhere");
  document.getElementById("root").innerHTML = '<main data-portal="page" data-ready="true" data-status="' + (missing ? 404 : 200) + '">'
    + blueprint.things.map((t) => '<div data-portal="thing-card" data-thing="' + t + '">' + t + '</div>').join("") + '<p>route ' + route + '</p><time data-clock>' + new Date().toISOString() + '</time></main>';
});
</script></body></html>`;

const server: PortalServerModule = {
  PortalServer: { handle: (context, request) => Promise.resolve(new URL(request.url).pathname === "/_portal/v1/blueprint" ? Response.json(context) : new Response("no", { status: 404 })) },
};
const run = (effect: unknown) => effect as Promise<Response>;

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "served-portal-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), SHELL);
});
afterAll(async () => { await ServedPortals.closeAll(); rmSync(dir, { recursive: true, force: true }); });

const open = (things: ReadonlyArray<string> = ["handle", "link"]) => ServedPortals.open({ context: { things }, clientDir: dir, server, run });

describe("served portal: the harness plays the Worker and reads the page as a person does", () => {
  it("renders the page in the browser: the hooks are on the DOM after the data arrived, not in the shell", async () => {
    const portal = await open();
    const page = await portal.page("/portal");
    expect(page.status).toBe(200);
    expect([...page.html.matchAll(/data-portal="thing-card" data-thing="(\w+)"/g)].map((m) => m[1])).toEqual(["handle", "link"]);
    expect(page.fetched.map((f) => f.path), "the data the browser read to draw it").toEqual(["/_portal/v1/blueprint"]);
    await portal.close();
  });

  it("holds the browser's clock fixed, so a client that reads the time shows it", async () => {
    const portal = await open();
    expect((await portal.page("/portal")).html).toContain(`<time data-clock="">${CLOCK_ISO}</time>`);
    await portal.close();
  });

  it("evaluates an expression in the ready page, and hands the answer back", async () => {
    const portal = await open();
    expect(await portal.evaluate<ReadonlyArray<string>>("/portal", "[...document.querySelectorAll('[data-thing]')].map((e) => e.getAttribute('data-thing'))")).toEqual(["handle", "link"]);
    await portal.close();
  });

  it("serves a route with a dot in its name as the shell, and says a page is a 404 by its own hook", async () => {
    const portal = await open();
    expect((await portal.page("/portal/operations/handle.claim?tab=metrics")).html).toContain("route /operations/handle.claim");
    expect((await portal.page("/portal/nowhere")).status, "the shell loads (200) and the page's own data-status says 404").toBe(404);
    await portal.close();
  });

  it("answers a data request directly, and not for a route outside the Worker's two prefixes", async () => {
    const portal = await open();
    expect(JSON.parse((await portal.data("/_portal/v1/blueprint")).text)).toEqual({ things: ["handle", "link"] });
    expect((await fetch(`${portal.url}/elsewhere`)).status).toBe(404);
    expect((await fetch(`${portal.url}/portal/missing.js`)).status, "a missing asset is a 404, not the shell").toBe(404);
    await portal.close();
  });

  it("keeps each parallel screenshot its own: eight routes shot together are eight pictures, the ones shot one by one", async () => {
    const portal = await open(["handle", "link", "profile", "thing"]);
    const routes = Array.from({ length: 8 }, (_, i) => `/portal/things/route-${i}-${"x".repeat(i * 7)}`);
    const serial: Array<string> = [];
    for (const route of routes) serial.push(Buffer.from(await portal.shoot(route)).toString("base64"));
    const together = (await Promise.all(routes.map((route) => portal.shoot(route)))).map((png) => Buffer.from(png).toString("base64"));
    expect(new Set(serial).size, "the routes differ").toBe(routes.length);
    expect(together).toEqual(serial);
    await portal.close();
  });

  it("takes the same screenshot twice, and a different one for different data", async () => {
    const first = await open();
    const again = await open();
    const other = await open(["handle"]);
    const a = await first.shoot("/portal");
    expect(a.length).toBeGreaterThan(100);
    expect(Buffer.from(await again.shoot("/portal")).equals(Buffer.from(a)), "two portals, two browser contexts, one picture").toBe(true);
    expect(Buffer.from(await other.shoot("/portal")).equals(Buffer.from(a)), "a different page is a different picture").toBe(false);
    await Promise.all([first.close(), again.close(), other.close()]);
  });
});

describe("served portal: a failed start leaves nothing listening", () => {
  const servers = () => process.getActiveResourcesInfo().filter((r) => r === "TCPServerWrap").length;

  it("when the browser will not launch, the Worker it had started is released, and closeAll has nothing left to stop", async () => {
    await ServedPortals.closeAll();
    const before = servers();
    const error = await ServedPortals.open({ context: {}, clientDir: dir, server, run, launch: () => Promise.reject(new Error("no chromium here")) }).catch((e: unknown) => e);
    expect((error as ServedPortalUnavailable).reason).toBe("no-browser");
    expect((error as Error).message).toMatch(/^K19: /);
    await ServedPortals.closeAll();
    await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
    expect(servers(), "no server is left listening").toBe(before);
  });
});

describe("served portal: a missing half says K19, never crashes", () => {
  it("no built client", async () => {
    const error = await ServedPortals.open({ context: {}, clientDir: join(dir, "nowhere"), server, run }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServedPortalUnavailable);
    expect((error as ServedPortalUnavailable).reason).toBe("no-client");
    expect((error as Error).message).toMatch(/^K19: the portal's client is not built/);
  });

  it("a server module that does not load", async () => {
    const specifier = "@orthograph/portal/no-such-server";
    const error = await ServedPortals.open({ context: {}, clientDir: dir, serverSpecifier: specifier }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServedPortalUnavailable);
    expect((error as ServedPortalUnavailable).reason).toBe("no-server");
    expect((error as Error).message.startsWith(`K19: ${specifier} does not load`), (error as Error).message).toBe(true);
  });

  it("a server module that loads but exports no PortalServer.handle", async () => {
    const error = await ServedPortals.open({ context: {}, clientDir: dir, serverSpecifier: "effect" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServedPortalUnavailable);
    expect((error as ServedPortalUnavailable).reason).toBe("no-server");
    expect((error as Error).message).toMatch(/^K19: effect loads but exports no `PortalServer\.handle/);
  });

  it("a page that never says it is ready", async () => {
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>x</title><p>no hooks</p>");
    const portal = await open();
    const error = await portal.page("/portal").catch((e: unknown) => e);
    expect((error as ServedPortalUnavailable).reason).toBe("never-ready");
    expect((error as Error).message).toContain("K19");
    await portal.close();
    writeFileSync(join(dir, "index.html"), SHELL);
  }, 30_000);
});
