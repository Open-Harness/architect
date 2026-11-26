// The judge of check 49 (Goal 18, slice 8, K44 call 2): what a portal says when its screens are not in the release. It reads
// answers only (status, content type, body, headers) from whatever `ask` reaches, so one judge serves the portal's server in this
// process, a world on workerd, and the plants that prove each rule can fail. The expected values come from the blueprint file
// (the model), never from the answer judged.
//
// THE SURFACE this judge requires, where K44 says "plainly" and does not fix the markup (the author's calls, each one line to move):
//   a request for the screens: any GET or HEAD under `/portal/` and `/portal` itself (the root, every thing's and operation's page
//   in the model, a verb like `.map`, a client file under `assets/`, a trace, a page with a query, a path no list holds) answers
//   501 (Not Implemented: the server knows the route and says the feature is not in this build; never 404, which says "no such
//   page", and never 5xx for a crash). Its words say "not in this release" and name the release as "Preview" (the alpha's name
//   on npm under `next`, `docs/canon/status.md`; not a "Preview 2"), and never the old "client is not installed" text. Who asks
//   picks the form, by `accept`, as the data's errors already do:
//     a browser (Chrome's and Firefox's or Safari's `accept` for a navigation) gets a page: `text/html`, starting `<!doctype html>`,
//     whose text a person sees says it and says no "404" or "not found". What a person sees is what Chromium renders with scripts off:
//     no comment, title, script, style, `template` or `noscript`, nothing `hidden`, `aria-hidden="true"`, `display:none`,
//     `visibility:hidden` or `opacity:0`, no box under 2 by 2 px (`sr-only`, a 1 px clip), nothing off the page's left or top edge, no
//     font under 8 px (`visible`, below, says how); the words are in the page as served, not written by a script;
//     an API client (`accept: application/json`, or axios's `application/json, text/plain, */*`) gets `application/json`,
//     `{ "_tag": "NotInThisRelease", "message": "..." }`, the message saying it (the shape of the data's own `{ _tag: "NotFound" }`);
//     a request with no `accept` (curl) gets either form, and still says it; a HEAD gets the 501 (its body is not judged);
//     every form carries `cache-control: no-store`, as today's 404 does, so a cached notice cannot hide a later build that has the screens.
//   The data is as today: `/_portal/v1/blueprint` (GET and HEAD 200 `application/json`, ETag the digest, and the blueprint file's
//   digest, project, and things and operations each with the file's `hash`; the server re-encodes the rest, so the rest is not compared), `/_portal/v1/snapshot?digest=<the digest>` (200, a JSON object for that digest), a snapshot for another digest (409
//   `BlueprintChanged` naming the current one), an unknown data path (404 `application/json` `{ _tag: "NotFound" }`); POST, PUT,
//   PATCH and DELETE on the screens and on the data are 405, `allow` GET and HEAD.
//   Not judged: what a path beside the portal (`/portalfoo`, `/_portal`) answers; the host routes those, and this slice changes neither.
import { readFileSync } from "node:fs";
import { chromium, type Browser } from "playwright";
import { join } from "node:path";
import { acme } from "./support.ts";

export interface Seen { readonly status: number; readonly type: string; readonly body: string; readonly etag: string | null; readonly allow: string | null; readonly cache: string | null }
/** One request: a path, a method (GET when left out) and an `accept` header (none when left out). */
export type Ask = (path: string, method?: string, accept?: string) => Promise<Seen>;

/** acme's blueprint file as its Worker holds it: the model's own things and operations, and the digest. */
export const blueprint = JSON.parse(readFileSync(join(acme, "generated/portal/blueprint.json"), "utf8")) as { digest: string; project: string; model: { things: Record<string, unknown>; operations: Record<string, unknown> } };
export const things = Object.keys(blueprint.model.things).sort();

/** The screens asked for: fixed shapes, every thing's and operation's page in the model, and a path made from the digest that no list holds. */
export const SCREENS: ReadonlyArray<string> = [
  "/portal", "/portal/", "/portal/things/allowance?tab=metrics", "/portal/operations/document.map",
  "/portal/assets/index-4f2a9c.js", "/portal/traces/0af7651916cd43dd8448eb211c80319c", `/portal/x-${blueprint.digest.slice(0, 12)}/deeper`,
  ...things.map((t) => `/portal/things/${t}`), ...Object.keys(blueprint.model.operations).sort().map((o) => `/portal/operations/${o}`),
];

/** What a browser sends for a page (Chrome's and Firefox's, then Safari's `accept` for a navigation), and what API clients send. */
export const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
export const BROWSERS = [BROWSER, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"] as const;
export const API = "application/json";
export const APIS = [API, "application/json, text/plain, */*"] as const;

/** Sorted-key JSON, so two answers with the same content compare equal whatever order their keys came in. */
export const canonical = (value: unknown): string => JSON.stringify(value, (_k, v: unknown) =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v);

const tried = async (ask: Ask, path: string, method?: string, accept?: string): Promise<Seen | string> => {
  try { return await ask(path, method, accept); } catch (error) { return `${method ?? "GET"} ${path}: the request threw: ${String(error).slice(0, 120)}`; }
};

const SAYS = /not in this release/i;
const NAMES = /\bpreview\b(?!\s*\d)/i;
const says = (at: string, text: string, raw: string, problems: string[]) => {
  if (!SAYS.test(text)) problems.push(`${at}: it does not say "not in this release": ${raw.slice(0, 80)}`);
  if (!NAMES.test(text)) problems.push(`${at}: it does not name the release (Preview): ${raw.slice(0, 80)}`);
  if (/not installed/i.test(raw)) problems.push(`${at}: the body is the old "client is not installed" text`);
};
const is501 = (at: string, seen: Seen, problems: string[]) => {
  if (seen.status !== 501) problems.push(`${at}: status ${seen.status}, not 501${seen.status === 404 ? " (a 404 says there is no such page)" : ""}: ${seen.body.slice(0, 80)}`);
};
const isType = (type: string, want: string) => new RegExp(`^${want.replace("/", "\\/")}\\s*(;|$)`, "i").test(type);

const noStore = (at: string, seen: Seen, problems: string[]) => {
  if (!/(^|,)\s*no-store\s*(,|$)/i.test(seen.cache ?? "")) problems.push(`${at}: cache-control ${JSON.stringify(seen.cache)}, not no-store`);
};

let browser: Promise<Browser> | undefined;
const seenText = new Map<string, Promise<string>>();
/**
 * The text a person sees on a page. Chromium renders it with scripts off, at 1280 by 800, and each text node counts only when a person
 * could read it: it is not inside a `noscript` (a browser with scripts on does not show it), `template`, `title`, `script` or `style`, nor
 * under `aria-hidden="true"`; and it and each element above it pass `checkVisibility` with opacity and visibility (so nothing
 * `display:none`, `hidden`, `visibility:hidden` or `opacity:0`), each element's box is at least 2 by 2 px (an `sr-only` span or a 1 px
 * clip is not), the text's own box lies on the page (not pushed off its left or top edge), and its font is at least 8 px. One browser,
 * each body once.
 */
export const visible = (html: string): Promise<string> => {
  const known = seenText.get(html);
  if (known !== undefined) return known;
  const text = (async () => {
    browser ??= chromium.launch({ headless: true });
    const context = await (await browser).newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    try {
      const tab = await context.newPage();
      await tab.setContent(html, { waitUntil: "load" });
      const seen = await tab.evaluate(() => {
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
        const pageWidth = document.documentElement.scrollWidth, pageHeight = document.documentElement.scrollHeight;
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const words = node.textContent ?? "";
          if (words.trim() === "") continue;
          const parent = node.parentElement;
          if (parent === null || parent.closest("noscript, template, title, script, style, [aria-hidden='true' i]") !== null) continue;
          let shown = true;
          for (let el: Element | null = parent; el !== null && el !== document.documentElement; el = el.parentElement) {
            const box = el.getBoundingClientRect();
            if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || box.width < 2 || box.height < 2) { shown = false; break; }
          }
          if (!shown) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const box = range.getBoundingClientRect();
          if (box.right <= 0 || box.bottom <= 0 || box.left >= pageWidth || box.top >= pageHeight) continue;
          if (parseFloat(getComputedStyle(parent).fontSize) < 8) continue;
          out.push(words);
        }
        return out.join(" ");
      });
      return seen.replace(/\s+/g, " ").trim();
    } finally { await context.close(); }
  })();
  seenText.set(html, text);
  return text;
};
/** Closes the browser `visible` opened; a test file's `afterAll` calls it. */
export const closeBrowser = async (): Promise<void> => { const open = browser; browser = undefined; seenText.clear(); if (open !== undefined) await (await open).close(); };

const page = async (at: string, seen: Seen, problems: string[]) => {
  is501(at, seen, problems);
  noStore(at, seen, problems);
  if (!isType(seen.type, "text/html")) problems.push(`${at}: content-type "${seen.type}", not text/html`);
  if (!/^\s*<!doctype html>/i.test(seen.body)) problems.push(`${at}: the body is not a page (no <!doctype html>): ${seen.body.slice(0, 80)}`);
  const text = await visible(seen.body);
  says(at, text, seen.body, problems);
  if (/\b404\b|not found/i.test(text)) problems.push(`${at}: the page says 404 or not found: ${text.slice(0, 80)}`);
};

const answer = (at: string, seen: Seen, problems: string[]) => {
  is501(at, seen, problems);
  noStore(at, seen, problems);
  if (!isType(seen.type, "application/json")) problems.push(`${at}: content-type "${seen.type}", not application/json`);
  const parsed = jsonOf(seen.body);
  if (parsed === undefined) { problems.push(`${at}: the body is not a JSON object: ${seen.body.slice(0, 80)}`); says(at, "", seen.body, problems); return; }
  if (parsed._tag !== "NotInThisRelease") problems.push(`${at}: _tag ${JSON.stringify(parsed._tag)}, not "NotInThisRelease"`);
  if (typeof parsed.message !== "string") problems.push(`${at}: no message string`);
  says(at, typeof parsed.message === "string" ? parsed.message : "", seen.body, problems);
};

/** A browser asking for the screens: each path of SCREENS, with each browser's `accept`, is the page saying so. Empty when it is. */
export const screens = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const [n, accept] of BROWSERS.entries()) for (const path of SCREENS) {
    const seen = await tried(ask, path, "GET", accept);
    if (typeof seen === "string") problems.push(seen); else await page(`a browser's GET ${path}${n === 0 ? "" : ` (browser ${n + 1})`}`, seen, problems);
  }
  return problems;
};

/** An API client asking for the screens: each path of SCREENS, with each API `accept`, is a 501 JSON NotInThisRelease saying so. */
export const screensForApi = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const [n, accept] of APIS.entries()) for (const path of SCREENS) {
    const seen = await tried(ask, path, "GET", accept);
    if (typeof seen === "string") problems.push(seen); else answer(`an API client's GET ${path}${n === 0 ? "" : ` (client ${n + 1})`}`, seen, problems);
  }
  return problems;
};

/** Anyone else: a GET with no `accept` is the 501 in either form, saying so; a HEAD is the 501. */
export const screensForAnyone = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const path of SCREENS) {
    const bare = await tried(ask, path, "GET");
    if (typeof bare === "string") problems.push(bare);
    else {
      const at = `a GET ${path} with no accept`;
      is501(at, bare, problems);
      noStore(at, bare, problems);
      const parsed = jsonOf(bare.body);
      says(at, isType(bare.type, "application/json") && typeof parsed?.message === "string" ? parsed.message : await visible(bare.body), bare.body, problems);
    }
    const head = await tried(ask, path, "HEAD", BROWSER);
    if (typeof head === "string") problems.push(head); else is501(`a HEAD ${path}`, head, problems);
  }
  return problems;
};

const jsonOf = (body: string): { _tag?: unknown; message?: unknown; [k: string]: unknown } | undefined => {
  try { const v: unknown = JSON.parse(body); return typeof v === "object" && v !== null && !Array.isArray(v) ? v as { _tag?: unknown; message?: unknown } : undefined; } catch { return undefined; }
};

const tagOf = (body: string): string | undefined => { try { return (JSON.parse(body) as { _tag?: string })._tag; } catch { return undefined; } };
const thingsOf = (body: string): ReadonlyArray<string> | null => { try { return Object.keys((JSON.parse(body) as { model: { things: object } }).model.things).sort(); } catch { return null; } };

export const UNKNOWN = ["/_portal/v1/no-such-thing", "/_portal/v1/blueprint/x", "/_portal/v2/x", "/_portal/"] as const;

/** The data, as it answers today: the blueprint (GET and HEAD), the snapshot for its digest and for another, unknown paths, and no notice in any. */
export const feed = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const method of ["GET", "HEAD"] as const) {
    const at = `blueprint (${method})`;
    const data = await tried(ask, "/_portal/v1/blueprint", method, API);
    if (typeof data === "string") { problems.push(data); continue; }
    if (data.status !== 200) problems.push(`${at}: status ${data.status}, not 200`);
    if (data.etag !== `"${blueprint.digest}"`) problems.push(`${at}: etag ${String(data.etag)}, not the digest ${blueprint.digest}`);
    if (!isType(data.type, "application/json")) problems.push(`${at}: content-type "${data.type}", not application/json`);
    if (method === "HEAD") continue;
    if (JSON.stringify(thingsOf(data.body)) !== JSON.stringify(things)) problems.push(`${at}: its things are ${JSON.stringify(thingsOf(data.body))}, not the model's ${JSON.stringify(things)}`);
    else {
      const served = parsedOf(data.body) as { digest?: unknown; project?: unknown; model?: { things?: unknown; operations?: unknown } } | undefined;
      const hashes = (of: unknown) => typeof of === "object" && of !== null ? Object.fromEntries(Object.entries(of).map(([k, v]) => [k, (v as { hash?: unknown } | null)?.hash])) : of;
      for (const [part, got, want] of [["digest", served?.digest, blueprint.digest], ["project", served?.project, blueprint.project], ["model.things", hashes(served?.model?.things), hashes(blueprint.model.things)], ["model.operations", hashes(served?.model?.operations), hashes(blueprint.model.operations)]] as const) {
        if (canonical(got) !== canonical(want)) problems.push(`${at}: its ${part} is not the blueprint file's`);
      }
    }
    if (SAYS.test(data.body)) problems.push(`${at}: carries the screens' notice`);
  }
  const snapshot = await tried(ask, `/_portal/v1/snapshot?digest=${blueprint.digest}`, "GET", API);
  if (typeof snapshot === "string") problems.push(snapshot);
  else {
    if (snapshot.status !== 200) problems.push(`snapshot: status ${snapshot.status}, not 200`);
    if (!isType(snapshot.type, "application/json")) problems.push(`snapshot: content-type "${snapshot.type}", not application/json`);
    const body = jsonOf(snapshot.body);
    if (body === undefined) problems.push(`snapshot: the body is not a JSON object: ${snapshot.body.slice(0, 80)}`);
    else if (body["blueprintDigest"] !== blueprint.digest) problems.push(`snapshot: blueprintDigest ${JSON.stringify(body["blueprintDigest"])}, not the digest asked for`);
    if (SAYS.test(snapshot.body)) problems.push("snapshot: carries the screens' notice");
  }
  const stale = await tried(ask, "/_portal/v1/snapshot?digest=0000", "GET", API);
  if (typeof stale === "string") problems.push(stale);
  else {
    const body = jsonOf(stale.body);
    if (stale.status !== 409) problems.push(`a snapshot for another digest: status ${stale.status}, not 409`);
    if (body?._tag !== "BlueprintChanged" || body["digest"] !== blueprint.digest) problems.push(`a snapshot for another digest: not { _tag: "BlueprintChanged", digest: <the current one> }: ${stale.body.slice(0, 80)}`);
  }
  for (const path of UNKNOWN) {
    const unknown = await tried(ask, path, "GET", API);
    if (typeof unknown === "string") { problems.push(unknown); continue; }
    const at = `an unknown data path ${path}`;
    if (unknown.status !== 404) problems.push(`${at}: status ${unknown.status}, not 404`);
    if (!isType(unknown.type, "application/json")) problems.push(`${at}: content-type "${unknown.type}", not application/json`);
    if (tagOf(unknown.body) !== "NotFound") problems.push(`${at}: body is not { _tag: "NotFound" }: ${unknown.body.slice(0, 80)}`);
  }
  return problems;
};

const parsedOf = (body: string): unknown => { try { return JSON.parse(body) as unknown; } catch { return undefined; } };
const allowed = (allow: string | null) => allow === null ? null : allow.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean).sort().join(", ");

/** Reading only: POST, PUT, PATCH and DELETE to the screens or to the data are 405, `allow` GET and HEAD, as today. */
export const methods = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const path of ["/portal", "/portal/things/allowance", "/_portal/v1/blueprint"]) for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const seen = await tried(ask, path, method);
    if (typeof seen === "string") { problems.push(seen); continue; }
    if (seen.status !== 405) problems.push(`${method} ${path}: status ${seen.status}, not 405`);
    if (allowed(seen.allow) !== "GET, HEAD") problems.push(`${method} ${path}: allow ${String(seen.allow)}, not GET and HEAD`);
  }
  return problems;
};

/** A response as `Seen`. */
export const seenOf = async (response: Response): Promise<Seen> => ({
  status: response.status, type: response.headers.get("content-type") ?? "", body: await response.text(), etag: response.headers.get("etag"), allow: response.headers.get("allow"), cache: response.headers.get("cache-control"),
});
