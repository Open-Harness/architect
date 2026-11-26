// Check 49 (Goal 18, slice 8, K44 call 2, issue #1066): the portal ships without its screens, and says so. The alpha's portal answers
// its server and its blueprint feed as today; asking for the screens says plainly that they are not in this release, not a 404 and not
// a crash; and nothing a published package builds from needs the HeroUI Pro licence. The requirements, one describe each:
//   A  the screens: with no client installed (what a published `@orthograph/portal` is: no `dist/client`), every GET and HEAD under
//      `/portal` is 501 saying "not in this release" and naming Preview: a page to a browser, a JSON `{ _tag: "NotInThisRelease" }` to
//      an API client, either to a request with no `accept` (`portal-screens.ts`, the top, holds the surface);
//   B  the data and the rules of reading, as today: blueprint, snapshot, an unknown data path, a POST (controls: they pass today);
//   C  in a real world on workerd, from a project whose installed `@orthograph/portal` has no `dist/client`, with the licence token
//      unset: `ortho build` exits 0 and ships no client, the feed answers, and A holds over HTTP;
//   D  the licence: building a published package that does not itself take Pro builds no package that needs it (the `build` task
//      graph of those packages, read from nx, holds no project, anywhere in the workspace, that declares `@heroui-pro/*`, and no command in
//      it reaches one), and the `@orthograph/portal` tarball, packed by pnpm from a checkout where the licensed client was built, holds only
//      the server's built files, and its published manifest needs no UI package. `portal-ui` stays published with Pro as a peer (Aaron's
//      F7 call of 19 November 2026; check 15): whether it is published is not this slice's.
// What a builder owes:
//   - a client that is not installed answers A (`packages/portal/src/modules/server/internal/client.ts`'s 404 becomes the notice, with
//     `cache-control: no-store` as the 404 has); the unit tests that pin today's 404 change with it, as the builder's own:
//     `packages/portal/src/modules/server/server.test.ts` ("a Worker with no assets says the client is not installed") and
//     `packages/prove/src/modules/environments/portal.test.ts` (the `else` branch expecting "not installed");
//   - `portal`'s build stops waiting for `portal-ui`'s (the client build, which needs the licence, is a target no package's `build` waits for);
//   - the portal's tarball leaves out a client a licensed checkout built. Where that client is, the check reads from the `outputs` of the
//     `portal:client` target in `packages/portal/project.json`, and always also `dist/client`: move the client and its `outputs` together.
//   A built client, where CI has one, is still served at `/portal` (checks 21 and 27 keep passing).
// Every judge is proved fair in the "controls" below: a correct stand-in passes, and each planted wrong answer is named.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { PortalServer } from "@orthograph/portal/server";
import { Worlds } from "@orthograph/prove";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import { API, APIS, BROWSER, BROWSERS, closeBrowser, feed, methods, screens, screensForAnyone, screensForApi, seenOf, blueprint, things, type Ask, type Seen } from "./portal-screens.ts";
import { acme, copyOf, repo } from "./support.ts";

// ---- the portal's server in this process: today's, a correct stand-in, and the plants ----

/** The real server, as a Worker holds it with no client installed (`env` has no `PORTAL_ASSETS`), or with one (`assets`). */
const real = (assets?: { fetch: (request: Request) => Promise<Response> }): Ask => async (path, method = "GET", accept) =>
  seenOf(await Effect.runPromise(PortalServer.serve(blueprint, new Request(`http://portal${path}`, { method, headers: accept === undefined ? {} : { accept } }), assets === undefined ? {} : { PORTAL_ASSETS: assets })));

const NOTICE = "<!doctype html><title>Portal</title><p>The portal's screens are not in this release (Preview). Its data is at /_portal/v1/blueprint.</p>";
const notice = (over: Partial<Seen> = {}): Seen => ({ status: 501, type: "text/html; charset=utf-8", body: NOTICE, etag: null, allow: null, cache: "no-store", ...over });
const MESSAGE = "The portal's screens are not in this release (Preview). Its data is at /_portal/v1/blueprint.";
const apiNotice = (over: Partial<Seen> = {}, body: unknown = { _tag: "NotInThisRelease", message: MESSAGE }): Seen =>
  ({ status: 501, type: "application/json", body: JSON.stringify(body), etag: null, allow: null, cache: "no-store", ...over });
/** Whether a request asks for JSON over HTML, as a server reading `accept` would decide. */
const wantsJson = (accept: string | undefined) => accept !== undefined && accept.includes("application/json") && !accept.includes("text/html");
const isScreen = (path: string) => path === "/portal" || path.startsWith("/portal/");
/** A correct stand-in: the real data, and the notice for the screens (using nothing a handler cannot reach: the request's path and method). */
const correct: Ask = (path, method = "GET", accept) =>
  (method === "GET" || method === "HEAD") && isScreen(path) ? Promise.resolve(wantsJson(accept) ? apiNotice() : notice()) : real()(path, method, accept);
/** A plant: the correct stand-in with one answer changed. `change` returns undefined to leave an answer as it is. */
const plant = (change: (path: string, method: string, accept: string | undefined) => Seen | undefined): Ask => async (path, method = "GET", accept) =>
  change(path, method, accept) ?? correct(path, method, accept);
/** A plant on the API client's answers only. */
const plantApi = (change: (path: string) => Seen | undefined): Ask => plant((p, m, a) => m === "GET" && isScreen(p) && wantsJson(a) ? change(p) : undefined);
/** The seven screens an earlier version of this check asked for: a server that knows only these is wrong. */
const SEVEN = new Set(["/portal", "/portal/", "/portal/things/allowance", "/portal/operations/allowance.spend", "/portal/operations/document.map", "/portal/assets/index-4f2a9c.js", "/portal/traces/0af7651916cd43dd8448eb211c80319c"]);

describe("49 A: asking for the screens says they are not in this release", () => {
  it("with no client installed, every request for a screen is 501, as HTML, saying so and naming the release", async () => {
    expect(await screens(real()), "today a missing client is a 404 \"not installed\" text").toEqual([]);
  });

  it("with no client installed, an API client's request for a screen is 501 JSON NotInThisRelease, saying so and naming the release", async () => {
    expect(await screensForApi(real()), "today a missing client is a 404 \"not installed\" text, whatever is asked").toEqual([]);
  });

  it("with no client installed, a request with no accept says so too, and a HEAD is the 501", async () => {
    expect(await screensForAnyone(real()), "today a missing client is a 404 \"not installed\" text, whatever is asked").toEqual([]);
  });

  it("the client a build installed, where CI has one, is still served at /portal (checks 21 and 27 keep passing)", async () => {
    const shell = "<!doctype html><script type=\"module\" src=\"/portal/assets/app.js\"></script>";
    const asked: string[] = [];
    const ask = real({ fetch: async (request) => { const path = new URL(request.url).pathname; asked.push(path); return path === "/" ? new Response(shell, { headers: { "content-type": "text/html" } }) : new Response("no file", { status: 404 }); } });
    const seen = await ask("/portal/things/allowance");
    expect(seen.status).toBe(200);
    expect(seen.body).toBe(shell);
    expect(asked, "a route is not a file: the client's shell answers it").toEqual(["/things/allowance", "/"]);
  });
});

describe("49 B: the data and the rules of reading are as today", () => {
  it("the blueprint (ETag the digest, the model's things), the snapshot and an unknown data path answer as they do now", async () => {
    expect(await feed(real())).toEqual([]);
  });
  it("a POST is 405 with allow GET, HEAD, to the screens and to the data", async () => {
    expect(await methods(real())).toEqual([]);
  });
});

describe("49 controls: each judge passes a correct stand-in and names each planted wrong answer", () => {
  it("a correct stand-in passes all five judges, and every model page and accept is asked", async () => {
    expect(await screens(correct)).toEqual([]);
    expect(await screensForApi(correct)).toEqual([]);
    expect(await screensForAnyone(correct)).toEqual([]);
    expect(BROWSERS.length + APIS.length).toBe(4);
    expect(BROWSERS[0]).toBe(BROWSER);
    expect(APIS[0]).toBe(API);
    expect(await feed(correct)).toEqual([]);
    expect(await methods(correct)).toEqual([]);
    expect(things.length, "the blueprint has things to compare").toBeGreaterThan(1);
  });

  const wrongScreens: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a 404 (today's)", plant((p) => isScreen(p) ? notice({ status: 404 }) : undefined), /status 404, not 501/],
    ["a 200 page", plant((p) => isScreen(p) ? notice({ status: 200 }) : undefined), /status 200, not 501/],
    ["a 500", plant((p) => isScreen(p) ? notice({ status: 500 }) : undefined), /status 500, not 501/],
    ["a crash (throws)", async (p, m, a) => { if (isScreen(p)) throw new Error("boom"); return correct(p, m, a); }, /threw/],
    ["the notice for /portal only, a 404 below it", plant((p) => isScreen(p) && p !== "/portal" ? notice({ status: 404 }) : undefined), /GET \/portal\/things\/allowance: status 404/],
    ["the notice below /portal only, a 404 at the root", plant((p) => p === "/portal" ? notice({ status: 404 }) : undefined), /GET \/portal: status 404/],
    ["the notice for pages only, a 404 for client files", plant((p) => p.startsWith("/portal/assets/") ? notice({ status: 404 }) : undefined), /assets\/index-4f2a9c\.js: status 404/],
    ["the notice for the verb path only wrongly a 404", plant((p) => p.endsWith(".map") ? notice({ status: 404 }) : undefined), /document\.map: status 404/],
    ["the notice for a trace only wrongly a 404", plant((p) => p.startsWith("/portal/traces/") ? notice({ status: 404 }) : undefined), /traces\/0af765\w*: status 404/],
    ["plain text", plant((p) => isScreen(p) ? notice({ type: "text/plain" }) : undefined), /not text\/html/],
    ["JSON", plant((p) => isScreen(p) ? notice({ type: "application/json" }) : undefined), /not text\/html/],
    ["a body that does not say it", plant((p) => isScreen(p) ? notice({ body: "<p>Preview only.</p>" }) : undefined), /does not say "not in this release"/],
    ["JSON to the browser too (the API's answer for both)", plant((p) => isScreen(p) ? apiNotice() : undefined), /not text\/html/],
    ["the notice to the API client only, a 404 to the browser", plant((p, _m, a) => isScreen(p) && !wantsJson(a) ? notice({ status: 404 }) : undefined), /a browser's GET \/portal: status 404/],
    ["a body that names no release", plant((p) => isScreen(p) ? notice({ body: "<p>The screens are not in this release.</p>" }) : undefined), /does not name the release/],
    ["a body that names only a version", plant((p) => isScreen(p) ? notice({ body: "<p>The screens are not in this release (0.1.0-next.1).</p>" }) : undefined), /does not name the release/],
    ["the old text", plant((p) => isScreen(p) ? notice({ body: `${NOTICE} The portal's client is not installed in this Worker.` }) : undefined), /old "client is not installed"/],
    ["an empty body", plant((p) => isScreen(p) ? notice({ body: "" }) : undefined), /does not say/],
    // the hostile pass's rows
    ["the notice for a fixed list of paths only, a 404 elsewhere", plant((p) => isScreen(p) && !SEVEN.has(p) ? notice({ status: 404 }) : undefined), /x-[0-9a-f]{12}\/deeper: status 404/],
    ["the notice for the seven paths and the model's pages only", plant((p) => p.includes("/x-") ? notice({ status: 404 }) : undefined), /x-[0-9a-f]{12}\/deeper: status 404/],
    ["a 404 for a page with a query", plant((p) => isScreen(p) && p.includes("?") ? notice({ status: 404 }) : undefined), /allowance\?tab=metrics: status 404/],
    ["a 404 for one thing's page the model has", plant((p) => p === `/portal/things/${things.at(-1)}` ? notice({ status: 404 }) : undefined), new RegExp(`things/${things.at(-1)}: status 404`)],
    ["a 404 for one operation's page the model has", plant((p) => p === "/portal/operations/invitation.revoke" ? notice({ status: 404 }) : undefined), /invitation\.revoke: status 404/],
    ["JSON to any accept but Chrome's (Safari gets JSON)", plant((p, _m, a) => isScreen(p) && a !== BROWSER ? apiNotice() : undefined), /\(browser 2\): content-type/],
    ["JSON labelled text/html", plant((p) => isScreen(p) ? notice({ body: JSON.stringify({ _tag: "NotInThisRelease", message: MESSAGE }) }) : undefined), /not a page/],
    ["the words only in a comment, the page saying 404", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>404 Not Found</h1><!-- The screens are not in this release (Preview). -->" }) : undefined), /does not say "not in this release"/],
    ["the words only in the title", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><title>Not in this release (Preview)</title><p>Hello.</p>" }) : undefined), /does not say "not in this release"/],
    ["the words only in a script", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><script>// not in this release (Preview)</script><p>Hello.</p>" }) : undefined), /does not say "not in this release"/],
    ["a page that says it and also 404", plant((p) => isScreen(p) ? notice({ body: `${NOTICE}<p>404 Not Found</p>` }) : undefined), /says 404 or not found/],
    ["another release named", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><p>The screens are not in this release. They come in Preview 2.</p>" }) : undefined), /does not name the release/],
    ["a look-alike type", plant((p) => isScreen(p) ? notice({ type: "text/html-fragment" }) : undefined), /not text\/html/],
    // the 🔍 review's rows: words a person does not see, under another heading
    ["the words only in a template, under another heading", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><template><p>The screens are not in this release (Preview).</p></template>" }) : undefined), /does not say "not in this release"/],
    ["the words only in a hidden paragraph", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><p hidden>The screens are not in this release (Preview).</p>" }) : undefined), /does not say "not in this release"/],
    ["the words only in display:none", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><p style=\"display:none\">The screens are not in this release (Preview).</p>" }) : undefined), /does not say "not in this release"/],
    ["the words only in visibility:hidden", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><p style=\"visibility: hidden\">The screens are not in this release (Preview).</p>" }) : undefined), /does not say "not in this release"/],
    ["the words only aria-hidden", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><div aria-hidden=\"true\"><p>The screens are not in this release (Preview).</p></div>" }) : undefined), /does not say "not in this release"/],
    ["the words only in noscript", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><noscript>The screens are not in this release (Preview).</noscript>" }) : undefined), /does not say "not in this release"/],
    ["the words hidden by a sheet", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><style>.n{display:none}</style><h1>Welcome</h1><p class=\"n\">The screens are not in this release (Preview).</p>" }) : undefined), /does not say "not in this release"/],
    ["the words written by a script only", plant((p) => isScreen(p) ? notice({ body: "<!doctype html><h1>Welcome</h1><p id=\"n\"></p><script>n.textContent = 'The screens are not in this release (Preview).'</script>" }) : undefined), /does not say "not in this release"/],
    ["a notice that may be cached", plant((p) => isScreen(p) ? notice({ cache: "public, max-age=3600" }) : undefined), /cache-control "public, max-age=3600", not no-store/],
    ["a notice with no cache-control", plant((p) => isScreen(p) ? notice({ cache: null }) : undefined), /cache-control null, not no-store/],
  ];
  it("the page judge reads what a person sees: the words visible under a heading of its own, and in a main, pass", async () => {
    for (const body of ["<!doctype html><h1>The portal's screens are not in this release (Preview)</h1>", "<!doctype html><main><section><p>The screens are</p><p>not in this release (Preview).</p></section></main>", `${NOTICE}<p hidden>404 Not Found</p>`]) {
      expect(await screens(plant((p) => isScreen(p) ? notice({ body }) : undefined)), body).toEqual([]);
    }
  });

  const wrongApi: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a 404 (today's)", plantApi(() => apiNotice({ status: 404 })), /status 404, not 501/],
    ["a 200", plantApi(() => apiNotice({ status: 200 })), /status 200, not 501/],
    ["a 500", plantApi(() => apiNotice({ status: 500 })), /status 500, not 501/],
    ["a crash (throws)", async (p, m, a) => { if (isScreen(p) && wantsJson(a)) throw new Error("boom"); return correct(p, m, a); }, /threw/],
    ["the page's HTML to the API client (the browser's answer for both)", plantApi(() => notice()), /not application\/json/],
    ["JSON labelled text/html", plantApi(() => apiNotice({ type: "text/html" })), /not application\/json/],
    ["the notice for the root only, a 404 below it", plantApi((p) => p === "/portal" ? undefined : apiNotice({ status: 404 })), /GET \/portal\/things\/allowance: status 404/],
    ["a 404 for client files only", plantApi((p) => p.startsWith("/portal/assets/") ? apiNotice({ status: 404 }) : undefined), /assets\/index-4f2a9c\.js: status 404/],
    ["another tag", plantApi(() => apiNotice({}, { _tag: "NotFound", message: MESSAGE })), /_tag "NotFound", not "NotInThisRelease"/],
    ["no tag", plantApi(() => apiNotice({}, { message: MESSAGE })), /_tag undefined/],
    ["no message", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease" })), /no message string/],
    ["a message that is not a string", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: [MESSAGE] })), /no message string/],
    ["a message that does not say it", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: "Preview only." })), /does not say "not in this release"/],
    ["a message that names no release", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: "The screens are not in this release." })), /does not name the release/],
    ["the words outside the message only", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: "No.", note: MESSAGE })), /does not say "not in this release"/],
    ["a list, not an object", plantApi(() => apiNotice({}, [{ _tag: "NotInThisRelease", message: MESSAGE }])), /not a JSON object/],
    ["null", plantApi(() => apiNotice({}, null)), /not a JSON object/],
    ["an empty body", plantApi(() => apiNotice({ body: "" })), /not a JSON object/],
    ["the old text as JSON", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: `${MESSAGE} The client is not installed.` })), /old "client is not installed"/],
    // the hostile pass's rows
    ["the page's HTML to axios's accept", plant((p, _m, a) => isScreen(p) && a === APIS[1] ? notice() : undefined), /\(client 2\): content-type/],
    ["a look-alike type", plantApi(() => apiNotice({ type: "application/json-seq" })), /not application\/json/],
    ["an answer that may be cached", plantApi(() => apiNotice({ cache: "max-age=60" })), /cache-control "max-age=60", not no-store/],
    ["a 404 for a path no list holds", plantApi((p) => p.includes("/x-") ? apiNotice({ status: 404 }) : undefined), /x-[0-9a-f]{12}\/deeper: status 404/],
    ["another release named", plantApi(() => apiNotice({}, { _tag: "NotInThisRelease", message: "The screens are not in this release; see Preview 2." })), /does not name the release/],
  ];

  const wrongAnyone: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a 404 to a request with no accept (curl)", plant((p, m, a) => m === "GET" && isScreen(p) && a === undefined ? notice({ status: 404 }) : undefined), /a GET \/portal with no accept: status 404/],
    ["a request with no accept told nothing", plant((p, m, a) => m === "GET" && isScreen(p) && a === undefined ? notice({ body: "<!doctype html><p>Hello.</p>" }) : undefined), /no accept: it does not say/],
    ["JSON with no message to a request with no accept", plant((p, m, a) => m === "GET" && isScreen(p) && a === undefined ? apiNotice({}, { _tag: "NotInThisRelease" }) : undefined), /no accept: it does not say/],
    ["a HEAD that is a 404", plant((p, m) => m === "HEAD" && isScreen(p) ? notice({ status: 404, body: "" }) : undefined), /a HEAD \/portal: status 404/],
    ["a HEAD that is a 200", plant((p, m) => m === "HEAD" && isScreen(p) ? notice({ status: 200, body: "" }) : undefined), /a HEAD \/portal: status 200/],
    ["a cached answer to a request with no accept", plant((p, m, a) => m === "GET" && isScreen(p) && a === undefined ? notice({ cache: "max-age=60" }) : undefined), /no accept: cache-control "max-age=60"/],
    ["the words only hidden, to a request with no accept", plant((p, m, a) => m === "GET" && isScreen(p) && a === undefined ? notice({ body: "<!doctype html><p hidden>The screens are not in this release (Preview).</p>" }) : undefined), /no accept: it does not say/],
  ];
  it.each(wrongAnyone)("screens (anyone else): %s is named", async (_name, ask, expected) => {
    const problems = await screensForAnyone(ask);
    expect(problems.length, "a wrong answer passed the judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });
  it.each(wrongApi)("screens (an API client): %s is named", async (_name, ask, expected) => {
    const problems = await screensForApi(ask);
    expect(problems.length, "a wrong answer passed the API judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });
  it.each(wrongScreens)("screens (a browser): %s is named", async (_name, ask, expected) => {
    const problems = await screens(ask);
    expect(problems.length, "a wrong answer passed the screens judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });

  const json = (body: unknown, over: Partial<Seen> = {}): Seen => ({ status: 200, type: "application/json", body: JSON.stringify(body), etag: null, allow: null, cache: null, ...over });
  const wrongFeed: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a blueprint that is a 404", plant((p) => p === "/_portal/v1/blueprint" ? json({ _tag: "NotFound" }, { status: 404, etag: `"${blueprint.digest}"` }) : undefined), /blueprint \(GET\): status 404/],
    ["a blueprint with another etag", plant((p) => p === "/_portal/v1/blueprint" ? json(blueprint, { etag: '"other"' }) : undefined), /blueprint \(GET\): etag/],
    ["a blueprint with no etag", plant((p) => p === "/_portal/v1/blueprint" ? json(blueprint) : undefined), /blueprint \(GET\): etag null/],
    ["a blueprint missing a thing", plant((p) => { if (p !== "/_portal/v1/blueprint") return undefined; const [, ...rest] = things; return json({ ...blueprint, model: { things: Object.fromEntries(rest.map((t) => [t, {}])) } }, { etag: `"${blueprint.digest}"` }); }), /blueprint \(GET\): its things/],
    ["a blueprint with an extra thing", plant((p) => p === "/_portal/v1/blueprint" ? json({ ...blueprint, model: { things: { ...blueprint.model.things, extra: {} } } }, { etag: `"${blueprint.digest}"` }) : undefined), /blueprint \(GET\): its things/],
    ["a blueprint that is the notice", plant((p) => p === "/_portal/v1/blueprint" ? notice({ etag: `"${blueprint.digest}"` }) : undefined), /blueprint \(GET\): status 501/],
    ["a snapshot that is the notice", plant((p) => p.startsWith("/_portal/v1/snapshot") ? notice() : undefined), /snapshot: status 501/],
    ["a snapshot as HTML", plant((p) => p.startsWith("/_portal/v1/snapshot") ? json({}, { type: "text/html" }) : undefined), /snapshot: content-type/],
    ["an unknown data path that is the notice", plant((p) => p === "/_portal/v1/no-such-thing" ? notice() : undefined), /no-such-thing: status 501/],
    ["an unknown data path that is a 200", plant((p) => p === "/_portal/v1/no-such-thing" ? json({ _tag: "NotFound" }) : undefined), /no-such-thing: status 200/],
    ["an unknown data path that is a 404 with no tag", plant((p) => p === "/_portal/v1/no-such-thing" ? json({}, { status: 404 }) : undefined), /not \{ _tag: "NotFound" \}/],
    // the hostile pass's rows
    ["a blueprint as text/html", plant((p, m) => p === "/_portal/v1/blueprint" && m === "GET" ? json(blueprint, { etag: `"${blueprint.digest}"`, type: "text/html" }) : undefined), /blueprint \(GET\): content-type/],
    ["a blueprint with each thing emptied", plant((p, m) => p === "/_portal/v1/blueprint" && m === "GET" ? json({ ...blueprint, model: { ...blueprint.model, things: Object.fromEntries(things.map((t) => [t, {}])) } }, { etag: `"${blueprint.digest}"` }) : undefined), /its model\.things is not the blueprint file's/],
    ["a blueprint with no digest field", plant((p, m) => { if (p !== "/_portal/v1/blueprint" || m !== "GET") return undefined; const { digest: _d, ...rest } = blueprint; return json(rest, { etag: `"${blueprint.digest}"` }); }), /its digest is not the blueprint file's/],
    ["a blueprint with an operation left out", plant((p, m) => { if (p !== "/_portal/v1/blueprint" || m !== "GET") return undefined; const [, ...ops] = Object.entries(blueprint.model.operations); return json({ ...blueprint, model: { ...blueprint.model, operations: Object.fromEntries(ops) } }, { etag: `"${blueprint.digest}"` }); }), /its model\.operations is not the blueprint file's/],
    ["a HEAD of the blueprint that is a 405", plant((p, m) => p === "/_portal/v1/blueprint" && m === "HEAD" ? json({}, { status: 405, allow: "GET" }) : undefined), /blueprint \(HEAD\): status 405/],
    ["a HEAD of the blueprint with no etag", plant((p, m) => p === "/_portal/v1/blueprint" && m === "HEAD" ? json({}) : undefined), /blueprint \(HEAD\): etag null/],
    ["a snapshot that is {}", plant((p) => p.startsWith(`/_portal/v1/snapshot?digest=${blueprint.digest}`) ? json({}) : undefined), /blueprintDigest undefined/],
    ["a snapshot for another blueprint", plant((p) => p.startsWith(`/_portal/v1/snapshot?digest=${blueprint.digest}`) ? json({ blueprintDigest: "0000" }) : undefined), /blueprintDigest "0000"/],
    ["a snapshot that is not JSON", plant((p) => p.startsWith(`/_portal/v1/snapshot?digest=${blueprint.digest}`) ? json({}, { body: "<html>oops</html>" }) : undefined), /snapshot: the body is not a JSON object/],
    ["a snapshot for another digest that is a 200", plant((p) => p === "/_portal/v1/snapshot?digest=0000" ? json({ blueprintDigest: blueprint.digest }) : undefined), /another digest: status 200/],
    ["a snapshot for another digest that names no digest", plant((p) => p === "/_portal/v1/snapshot?digest=0000" ? json({ _tag: "BlueprintChanged" }, { status: 409 }) : undefined), /another digest: not \{ _tag: "BlueprintChanged"/],
    ["an unknown data path as text/html", plant((p) => p === "/_portal/v1/no-such-thing" ? json({ _tag: "NotFound" }, { status: 404, type: "text/html" }) : undefined), /no-such-thing: content-type/],
    ["another unknown data path that is the notice", plant((p) => p === "/_portal/v2/x" ? notice() : undefined), /\/_portal\/v2\/x: status 501/],
    ["an unknown path under the blueprint that is the blueprint", plant((p) => p === "/_portal/v1/blueprint/x" ? json(blueprint, { etag: `"${blueprint.digest}"` }) : undefined), /blueprint\/x: status 200/],
    ["a feed that throws", async (p, m, a) => { if (p.startsWith("/_portal/")) throw new Error("boom"); return correct(p, m, a); }, /threw/],
  ];
  it.each(wrongFeed)("feed: %s is named", async (_name, ask, expected) => {
    const problems = await feed(ask);
    expect(problems.length, "a wrong answer passed the feed judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });

  const wrongMethods: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a POST to the screens that is the notice", plant((p, m) => m === "POST" && p === "/portal" ? notice() : undefined), /POST \/portal: status 501/],
    ["a POST to the data that is a 200", plant((p, m) => m === "POST" && p === "/_portal/v1/blueprint" ? json({}) : undefined), /POST \/_portal\/v1\/blueprint: status 200/],
    ["a 405 with no allow", plant((p, m) => m === "POST" ? notice({ status: 405 }) : undefined), /allow null/],
    ["a 405 allowing POST", plant((p, m) => m === "POST" ? notice({ status: 405, allow: "GET, HEAD, POST" }) : undefined), /allow GET, HEAD, POST/],
    // the hostile pass's rows
    ["a PUT to the data that is a 200", plant((p, m) => m === "PUT" && p === "/_portal/v1/blueprint" ? json({}) : undefined), /PUT \/_portal\/v1\/blueprint: status 200/],
    ["a DELETE to the data that is a 200", plant((p, m) => m === "DELETE" && p === "/_portal/v1/blueprint" ? json({}) : undefined), /DELETE \/_portal\/v1\/blueprint: status 200/],
    ["a PATCH to a screen that is the notice", plant((p, m) => m === "PATCH" && p === "/portal" ? notice() : undefined), /PATCH \/portal: status 501/],
    ["a POST to a deep screen that is the notice", plant((p, m) => m === "POST" && p === "/portal/things/allowance" ? notice() : undefined), /POST \/portal\/things\/allowance: status 501/],
    ["a 405 allowing GET only", plant((_p, m) => m !== "GET" && m !== "HEAD" ? json({}, { status: 405, allow: "GET" }) : undefined), /allow GET, not GET and HEAD/],
  ];
  it("methods: `allow` is read as a set, so `GET,HEAD` and `HEAD, GET` pass", async () => {
    expect(await methods(plant((_p, m) => m !== "GET" && m !== "HEAD" ? json({}, { status: 405, allow: "HEAD,GET" }) : undefined))).toEqual([]);
  });
  it.each(wrongMethods)("methods: %s is named", async (_name, ask, expected) => {
    const problems = await methods(ask);
    expect(problems.length, "a wrong answer passed the methods judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });
});

// ---- C: a project whose installed portal has no client, built and run with no licence ----

const KEY = "HEROUI_AUTH_TOKEN";
const unlicensed = (): NodeJS.ProcessEnv => { const env = { ...process.env }; delete env[KEY]; return env; };
const cli = join(repo, "packages/cli/src/main.ts");
const portalPackage = join(repo, "packages/portal");
const spare: string[] = [];
afterAll(async () => { for (const dir of spare) rmSync(dir, { recursive: true, force: true }); await closeBrowser(); });

/**
 * A project as a published install leaves it: its `@orthograph/portal` is a folder with the manifest (a real file, so the project resolves
 * the folder itself and not this repository's package) and the source, and no `dist/client`.
 */
const withoutClient = (root: string) => {
  const scope = join(root, "node_modules/@orthograph");
  const packages = readdirSync(scope).map((name) => [name, realpathSync(join(scope, name))] as const);
  unlinkSync(scope);
  mkdirSync(scope);
  for (const [name, target] of packages) if (name !== "portal") symlinkSync(target, join(scope, name));
  const folder = join(scope, "portal");
  mkdirSync(folder);
  cpSync(join(portalPackage, "package.json"), join(folder, "package.json"));
  for (const entry of readdirSync(portalPackage)) if (entry !== "package.json" && entry !== "dist") symlinkSync(join(portalPackage, entry), join(folder, entry));
  expect(existsSync(join(folder, "dist")), "the installed portal has no built client").toBe(false);
};
const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=g18", "-c", "user.email=g18@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
};
const fresh = () => {
  const copy = copyOf(acme);
  writeFileSync(join(copy.root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  withoutClient(copy.root);
  git(copy.root, "init", "-q", "-b", "main");
  git(copy.root, "add", "-A");
  git(copy.root, "commit", "-q", "-m", "fresh");
  return copy;
};

describe("49 C: a built and running project, with no client installed and no licence", () => {
  it("`ortho build` with the token unset exits 0 and ships no client", { timeout: 300_000 }, () => {
    const copy = fresh();
    try {
      const built = spawnSync(process.execPath, [cli, "build", "--root", copy.root], { cwd: copy.root, encoding: "utf8", env: unlicensed(), maxBuffer: 64 * 1024 * 1024 });
      const out = `${built.stdout}${built.stderr}`;
      expect(built.status, `ortho build with ${KEY} unset: ${out.slice(-1500)}`).toBe(0);
      const revision = /^built (\S+) sha256:[0-9a-f]{64}$/m.exec(built.stdout)?.[1];
      expect(revision, out).toBeDefined();
      const shipped = join(copy.root, ".ortho/artefacts", revision!, "portal");
      expect(existsSync(join(shipped, "index.html")), "no screens are in the revision").toBe(false);
    } finally { copy.remove(); }
  });

  describe("in a world on workerd", () => {
    const scope = Effect.runSync(Scope.make());
    let copy: ReturnType<typeof fresh> | undefined;
    let url = "";
    beforeAll(async () => {
      delete process.env[KEY]; // each test file runs in its own process: nothing outside this file sees the change
      copy = fresh();
      const world = await Effect.runPromise(Effect.gen(function* () {
        return yield* Worlds.start({ root: copy!.root, port: yield* Effect.promise(freePort), name: "g18-portal-no-screens" });
      }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)));
      url = world.url;
    }, 300_000);
    afterAll(async () => {
      await Effect.runPromise(Scope.close(scope, Exit.void));
      copy?.remove();
    }, 120_000);
    const ask: Ask = async (path, method = "GET", accept) => seenOf(await fetch(`${url}${path}`, { method, headers: accept === undefined ? {} : { accept } }));

    it("the world answers the feed and the rules of reading as today (over HTTP)", async () => {
      expect(await feed(ask), "the feed, over HTTP").toEqual([]);
      expect(await methods(ask), "the rules of reading, over HTTP").toEqual([]);
    });
    it("a browser's request for the screens says they are not in this release (over HTTP)", async () => {
      expect(await screens(ask), "the screens to a browser, over HTTP").toEqual([]);
    });
    it("an API client's request for the screens says they are not in this release (over HTTP)", async () => {
      expect(await screensForApi(ask), "the screens to an API client, over HTTP").toEqual([]);
    });
    it("a request with no accept says so too, and a HEAD is the 501 (over HTTP)", async () => {
      expect(await screensForAnyone(ask), "the screens to anyone else, over HTTP").toEqual([]);
    });
  });
});

// ---- D: the licence ----

interface Manifest { readonly name: string; readonly private?: boolean; readonly dependencies?: Record<string, string>; readonly devDependencies?: Record<string, string>; readonly peerDependencies?: Record<string, string>; readonly optionalDependencies?: Record<string, string>; readonly bundleDependencies?: ReadonlyArray<string>; readonly bundledDependencies?: ReadonlyArray<string> }
const nx = join(repo, "node_modules/.bin/nx");
interface Target { readonly options?: { readonly command?: string; readonly commands?: ReadonlyArray<string | { command: string }> } }
/** Every project nx knows (packages, examples, tools: the whole workspace), with its folder and its targets, read once from `nx graph`. */
const projects = (() => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-8-graph-"));
  const file = join(parent, "graph.json");
  const ran = spawnSync(nx, ["graph", `--file=${file}`], { cwd: repo, encoding: "utf8", env: { ...process.env, NX_DAEMON: "false" }, maxBuffer: 64 * 1024 * 1024 });
  if (ran.status !== 0) throw new Error(`nx graph: ${ran.stdout}${ran.stderr}`.slice(-800));
  const nodes = (JSON.parse(readFileSync(file, "utf8")) as { graph: { nodes: Record<string, { data: { root: string; targets?: Record<string, Target> } }> } }).graph.nodes;
  rmSync(parent, { recursive: true, force: true });
  return Object.entries(nodes).map(([name, node]) => ({ name, root: node.data.root, targets: node.data.targets ?? {} }));
})();
const manifestOf = (root: string): Manifest | undefined => existsSync(join(repo, root, "package.json")) ? JSON.parse(readFileSync(join(repo, root, "package.json"), "utf8")) as Manifest : undefined;
const manifests = projects.filter((p) => p.root.startsWith("packages/")).flatMap((p) => { const manifest = manifestOf(p.root); return manifest === undefined ? [] : [{ dir: p.name, root: p.root, manifest }]; });
const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
const needsPro = (m: Manifest) => FIELDS.some((f) => Object.keys(m[f] ?? {}).some((n) => n.startsWith("@heroui-pro/")));
/** The nx projects, anywhere in the workspace, whose manifest declares the licensed package: found from the manifests, not from any task output. */
const licensed = projects.filter((p) => { const m = manifestOf(p.root); return m !== undefined && needsPro(m); }).map((p) => p.name);
const licensedRoots = projects.filter((p) => licensed.includes(p.name)).map((p) => p.root);
const licensedNames = [...licensed, ...licensedRoots.map((r) => manifestOf(r)!.name)];
const published = manifests.filter((m) => m.manifest.private !== true);
/**
 * The published packages that do not themselves declare the licensed package. `portal-ui` is published and takes Pro as a peer (Aaron,
 * 19 November 2026, F7: a published package may import Pro without containing it; check 15 holds it so): building it needs the licence,
 * so no other published package's build may wait for it. Whether `portal-ui` itself is published is not this slice's (the 🔍 review of #1098).
 */
const unlicensedPublished = published.filter((m) => !licensed.includes(m.dir));
/** A dependency that is a UI package: React and Preact, the portal's components and the new portal, the web kit, HeroUI, a client bundler. */
const UI = /^(react|react-dom|preact|@orthograph\/(portal-ui|portal-next|web|shell|theme)|@heroui|@heroui-pro|@ui-sdk|@tanstack\/react-[^/]+|vite|@vitejs)(\/|$)/;
/** The text of a target's command(s). */
const commandOf = (target: Target | undefined): string => [target?.options?.command ?? "", ...(target?.options?.commands ?? []).map((c) => typeof c === "string" ? c : c.command)].join(" && ");
/** What in a command reaches the licence: a licensed project's folder or name, Pro's gate script, or HeroUI Pro itself. */
const reachesLicence = (command: string): boolean => /pro\.mjs|heroui-pro|HEROUI_AUTH_TOKEN/i.test(command) || licensedRoots.some((r) => command.includes(r) || command.includes(`../${r.split("/").at(-1)}`)) || licensedNames.some((n) => new RegExp(`(^|[\\s"'=])${n.replace(/[/@.-]/g, "\\$&")}([\\s"':]|$)`).test(command));

const buildGraph = (projects: ReadonlyArray<string>): ReadonlyArray<string> => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-8-"));
  spare.push(parent);
  const file = join(parent, "graph.json");
  const ran = spawnSync(nx, ["run-many", "-t", "build", "-p", projects.join(","), `--graph=${file}`], { cwd: repo, encoding: "utf8", env: { ...unlicensed(), NX_DAEMON: "false" }, maxBuffer: 64 * 1024 * 1024 });
  expect(ran.status, `${ran.stdout}${ran.stderr}`.slice(-1500)).toBe(0);
  return Object.keys((JSON.parse(readFileSync(file, "utf8")) as { tasks: { tasks: Record<string, unknown> } }).tasks.tasks);
};

/**
 * The files of a tarball that are screens, or are not the server: anything but the manifest, the readme, the licence and `dist/` built
 * `.js`/`.d.ts` (and their maps) is named, and so is anything under the client's output (nx's `outputs` of `client`, and `dist/client`)
 * and anything built from the client's entry (`src/main.ts`) or the pages (`src/modules/pages/`).
 */
const screensOf = (files: ReadonlyArray<string>): ReadonlyArray<string> => {
  const roots = [...clientOutputs(), "dist/client"];
  const server = (f: string) => ["package.json", "README.md", "LICENSE"].includes(f) || /^dist\/.+\.(js|d\.ts)(\.map)?$/.test(f);
  return files.filter((f) => !server(f) || roots.some((r) => f === r || f.startsWith(`${r}/`)) || /^dist\/main\.(js|d\.ts)/.test(f) || f.startsWith("dist/modules/pages/"));
};
/** The UI packages a published manifest names, in any field npm installs or bundles. */
const uiOf = (m: Manifest): ReadonlyArray<string> => [
  ...(["dependencies", "peerDependencies", "optionalDependencies"] as const).flatMap((f) => Object.keys(m[f] ?? {}).map((n) => `${f}: ${n}`)),
  ...[...(m.bundleDependencies ?? []), ...(m.bundledDependencies ?? [])].map((n) => `bundled: ${n}`),
].filter((entry) => UI.test(entry.split(": ")[1]!));

/** Where nx says the portal's licensed `client` target writes (its `outputs`), relative to the package: none when there is no such target. */
const clientOutputs = (): ReadonlyArray<string> => {
  const project = JSON.parse(readFileSync(join(portalPackage, "project.json"), "utf8")) as { targets?: Record<string, { outputs?: ReadonlyArray<string> }> };
  return (project.targets?.client?.outputs ?? []).map((o) => o.replace(/^\{projectRoot\}\//, "")).filter((o) => !o.startsWith("{"));
};
const versions = Object.fromEntries(manifests.map((m) => [m.manifest.name, (m.manifest as Manifest & { version?: string }).version ?? "0.0.0"]));

/**
 * The portal packed as a publish packs it: built with `nx run portal:build` (licence unset), copied to a folder of its own beside a client
 * as `portal:client` leaves it (a licensed checkout: index.html, a script and a sheet, at the target's outputs), its `workspace:` links
 * written as the linked package's version (what pnpm's publish writes; outside the workspace pnpm cannot resolve them), and `pnpm pack`ed.
 * The tarball is read with `tar`, never from the command that made it.
 */
const pack = () => {
  const built = spawnSync(nx, ["run", "portal:build", "--excludeTaskDependencies"], { cwd: repo, encoding: "utf8", env: { ...unlicensed(), NX_DAEMON: "false", FORCE_COLOR: "0", NO_COLOR: "1" }, maxBuffer: 64 * 1024 * 1024 });
  expect(built.status, `nx run portal:build: ${built.stdout}${built.stderr}`.slice(-1500)).toBe(0);
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-8-pack-"));
  spare.push(parent);
  const folder = join(parent, "portal");
  cpSync(portalPackage, folder, { recursive: true, filter: (from) => !from.split("/").includes("node_modules") });
  const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as Record<string, unknown>;
  for (const field of FIELDS) {
    const deps = manifest[field] as Record<string, string> | undefined;
    for (const [name, range] of Object.entries(deps ?? {})) if (range.startsWith("workspace:")) deps![name] = versions[name] ?? "0.0.0";
  }
  writeFileSync(join(folder, "package.json"), JSON.stringify(manifest, null, 2));
  const planted: string[] = [];
  for (const root of clientOutputs()) {
    for (const [file, text] of [["index.html", "<!doctype html><script type=\"module\" src=\"/portal/assets/index-4f2a9c.js\"></script>"], ["assets/index-4f2a9c.js", "export {};"], ["assets/index-4f2a9c.css", "body{}"]] as const) {
      mkdirSync(join(folder, root, file, ".."), { recursive: true });
      writeFileSync(join(folder, root, file), text);
      planted.push(`${root}/${file}`);
    }
  }
  const out = join(parent, "out");
  mkdirSync(out);
  const done = spawnSync("pnpm", ["pack", "--pack-destination", out], { cwd: folder, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
  expect(done.status, `pnpm pack: ${done.stdout}${done.stderr}`.slice(-1500)).toBe(0);
  const tgz = join(out, readdirSync(out).find((f) => f.endsWith(".tgz"))!);
  const files = spawnSync("tar", ["-tzf", tgz], { encoding: "utf8" }).stdout.split("\n").filter(Boolean).map((f) => f.replace(/^package\//, "")).sort();
  const published = JSON.parse(spawnSync("tar", ["-xOzf", tgz, "package/package.json"], { encoding: "utf8" }).stdout) as Manifest;
  return { files, manifest: published, planted };
};

describe("49 D: nothing a published package builds from needs the HeroUI Pro licence", () => {
  it("the oracle is real: portal-ui declares the licensed package, and the portal is among the published packages", () => {
    expect(unlicensedPublished.map((m) => m.dir), "the graph starts from the unlicensed published packages").toContain("portal");
    expect(unlicensedPublished.map((m) => m.dir)).not.toContain("portal-ui");
    expect(licensed, "the packages that declare @heroui-pro/*").toContain("portal-ui");
    expect(published.map((m) => m.manifest.name)).toContain("@orthograph/portal");
    expect(published.map((m) => m.manifest.name)).toContain("orthograph");
  });

  it("the build tasks of every published package include no project that declares @heroui-pro/*", { timeout: 300_000 }, () => {
    const tasks = buildGraph(unlicensedPublished.map((m) => m.dir));
    expect(tasks.length, "the graph has tasks").toBeGreaterThanOrEqual(unlicensedPublished.length);
    const pulled = tasks.filter((t) => licensed.includes(t.split(":")[0]!));
    expect(pulled, "K44 call 2: building a package that ships needs no licence, so no `build` here may wait for a package that needs it").toEqual([]);
  });

  it("no build task a published package runs reaches the licence from its command (a licensed folder or project, Pro's gate, the token)", { timeout: 300_000 }, () => {
    const tasks = buildGraph(unlicensedPublished.map((m) => m.dir));
    // a licensed project's own task is the graph's finding above; this one judges what every other task's command reaches
    const reaching = tasks.filter((t) => { const [name, target] = t.split(":"); return !licensed.includes(name!) && reachesLicence(commandOf(projects.find((p) => p.name === name)?.targets[target!])); });
    expect(reaching, "a build command that shells out to the licence").toEqual([]);
  });

  describe("the portal's tarball, packed by pnpm from a checkout where the licensed client was built", () => {
    /** What pnpm puts in `@orthograph/portal`'s tarball: its files (without `package/`) and its manifest as published. Packed once. */
    let tarball: { readonly files: ReadonlyArray<string>; readonly manifest: Manifest; readonly planted: ReadonlyArray<string> } | undefined;
    beforeAll(() => { tarball = pack(); }, 300_000);

    it("holds the server and the feed: its built entry files, as a publish builds them", () => {
      expect(tarball!.files, "pnpm's tarball").toEqual(expect.arrayContaining(["package.json", "dist/index.js", "dist/server.js"]));
      expect(tarball!.manifest.name).toBe("@orthograph/portal");
    });

    it("holds no screens: no client file, no page and no page source, and its published manifest needs no UI package", () => {
      expect(tarball!.planted.length, "a client was planted where nx says `portal:client` writes it").toBeGreaterThan(0);
      expect(screensOf(tarball!.files), "K44 call 2: the portal's tarball carries the screens").toEqual([]);
      expect(uiOf(tarball!.manifest), "K44 call 2: the published manifest needs a UI package").toEqual([]);
    });
  });

  describe("controls: the graph judge sees a licensed task, and the manifest judge a UI dependency", () => {
    it("the graph of portal-ui's own build holds portal-ui, and the judge's filter names it", { timeout: 300_000 }, () => {
      const tasks = buildGraph(["portal-ui"]);
      expect(tasks.filter((t) => licensed.includes(t.split(":")[0]!))).toEqual(["portal-ui:build"]);
    });
    it("a manifest with a UI dependency is named by the same pattern, in each field, and a server dependency is not", () => {
      for (const planted of ["react", "react-dom", "preact", "@orthograph/portal-ui", "@orthograph/portal-next", "@orthograph/web", "@heroui/react", "@heroui-pro/react", "@ui-sdk/react", "@tanstack/react-query", "vite", "@vitejs/plugin-react"]) {
        expect(UI.test(planted), planted).toBe(true);
        for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) expect(uiOf({ name: "x", [field]: { effect: "4.1.4", [planted]: "1.0.0" } }), `${planted} in ${field}`).toEqual([`${field}: ${planted}`]);
        expect(uiOf({ name: "x", bundleDependencies: [planted] }), `${planted} bundled`).toEqual([`bundled: ${planted}`]);
      }
      for (const fine of ["effect", "reactive-x", "@orthograph/services", "@orthograph/logbook", "orthograph", "vitest"]) expect(UI.test(fine), fine).toBe(false);
      expect(uiOf({ name: "x", devDependencies: { react: "19.3.1" } }), "a dev dependency is not installed by a user").toEqual([]);
    });
    it("the tarball judge passes the server's files and names each kind of screen file", () => {
      const good = ["LICENSE", "README.md", "package.json", "dist/index.js", "dist/index.d.ts", "dist/server.js", "dist/modules/server/service.js", "dist/modules/server/service.js.map"];
      expect(screensOf(good)).toEqual([]);
      for (const planted of ["dist/client/index.html", "dist/client/assets/index-4f2a9c.js", "dist/client/assets/font.woff2", "dist/client/icon.svg", "dist/main.js", "dist/modules/pages/internal/app.js", "src/main.ts", "src/modules/pages/internal/app.tsx", "portal.html", "index.html", "screens/App.js", "dist/portal.css"]) {
        expect(screensOf([...good, planted]), planted).toEqual([planted]);
      }
    });
    it("the command judge names each way a command reaches the licence, and passes the portal's own build", () => {
      expect(licensedRoots, "the licensed folders").toContain("packages/portal-ui");
      expect(reachesLicence(commandOf(projects.find((p) => p.name === "portal")!.targets["build"])), "portal's build today").toBe(false);
      expect(reachesLicence(commandOf(projects.find((p) => p.name === "portal")!.targets["typecheck"])), "portal's typecheck runs Pro's gate").toBe(true);
      for (const planted of ["tsc -p x && node ../portal-ui/tools/pro.mjs pro require vite build", "pnpm --filter @orthograph/portal-ui build", "nx run portal-ui:build", "tsc -p packages/portal-ui/tsconfig.build.json", "HEROUI_AUTH_TOKEN=$T vite build", "cd ../portal-ui && tsc"]) {
        expect(reachesLicence(planted), planted).toBe(true);
      }
    });
  });
});
