// The judge of check 49 (Goal 18, slice 8, K44 call 2): what a portal says when its screens are not in the release. It reads
// answers only (status, content type, body, headers) from whatever `ask` reaches, so one judge serves the portal's server in this
// process, a world on workerd, and the plants that prove each rule can fail. The expected values come from the blueprint file
// (the model), never from the answer judged.
//
// THE SURFACE this judge requires, where K44 says "plainly" and does not fix the markup (the author's calls, each one line to move):
//   a request for the screens: any GET under `/portal` (the root, a page, a verb like `.map`, a client file under `assets/`, a trace)
//   answers 501 (Not Implemented: the server knows the route and says the feature is not in this build; never 404, which says
//   "no such page", and never 5xx for a crash), with a body that says "not in this release" and names the release as "Preview"
//   (the alpha's name on npm under `next`, `docs/canon/status.md`), and is not the old "client is not installed" 404 text. Who asks
//   picks the form, by `accept`, as the data's errors already do:
//     a browser (`accept: text/html,...`, what a browser sends for a page) gets `text/html`;
//     an API client (`accept: application/json`) gets `application/json`, `{ "_tag": "NotInThisRelease", "message": "..." }`, the
//     message saying "not in this release" and naming Preview (the `_tag` shape of the data's own `{ _tag: "NotFound" }`).
//   The data is as today: `/_portal/v1/blueprint` (200, ETag the digest, the blueprint), `/_portal/v1/snapshot?digest=` (200), an
//   unknown `/_portal/v1/*` is a 404 JSON `{ _tag: "NotFound" }`; a method other than GET and HEAD is 405 with `allow`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { acme } from "./support.ts";

export interface Seen { readonly status: number; readonly type: string; readonly body: string; readonly etag: string | null; readonly allow: string | null }
/** One request: a path, a method (GET when left out) and an `accept` header (none when left out). */
export type Ask = (path: string, method?: string, accept?: string) => Promise<Seen>;

/** What a browser sends for a page (Chrome's and Firefox's `accept` for a navigation), and what an API client sends. */
export const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
export const API = "application/json";

export const SCREENS = [
  "/portal", "/portal/", "/portal/things/allowance", "/portal/operations/allowance.spend", "/portal/operations/document.map",
  "/portal/assets/index-4f2a9c.js", "/portal/traces/0af7651916cd43dd8448eb211c80319c",
] as const;

/** acme's blueprint file as its Worker holds it: the model's own list of things, and the digest. */
export const blueprint = JSON.parse(readFileSync(join(acme, "generated/portal/blueprint.json"), "utf8")) as { digest: string; model: { things: Record<string, unknown> } };
export const things = Object.keys(blueprint.model.things).sort();

const tried = async (ask: Ask, path: string, method?: string, accept?: string): Promise<Seen | string> => {
  try { return await ask(path, method, accept); } catch (error) { return `${method ?? "GET"} ${path}: the request threw: ${String(error).slice(0, 120)}`; }
};

const common = (at: string, seen: Seen, text: string, problems: string[]) => {
  if (seen.status !== 501) problems.push(`${at}: status ${seen.status}, not 501${seen.status === 404 ? " (a 404 says there is no such page)" : ""}: ${seen.body.slice(0, 80)}`);
  if (!/not in this release/i.test(text)) problems.push(`${at}: it does not say "not in this release": ${seen.body.slice(0, 80)}`);
  if (!/\bpreview\b/i.test(text)) problems.push(`${at}: it does not name the release (Preview): ${seen.body.slice(0, 80)}`);
  if (/not installed/i.test(seen.body)) problems.push(`${at}: the body is the old "client is not installed" text`);
};

/** A browser asking for the screens: each path of SCREENS says, plainly and as a page, that they are not in this release. Empty when it does. */
export const screens = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const path of SCREENS) {
    const seen = await tried(ask, path, "GET", BROWSER);
    if (typeof seen === "string") { problems.push(seen); continue; }
    const at = `a browser's GET ${path}`;
    common(at, seen, seen.body, problems);
    if (!/^text\/html\b/i.test(seen.type)) problems.push(`${at}: content-type "${seen.type}", not text/html`);
  }
  return problems;
};

/** An API client asking for the screens: each path of SCREENS is a 501 JSON `{ _tag: "NotInThisRelease", message }` saying so. Empty when it is. */
export const screensForApi = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const path of SCREENS) {
    const seen = await tried(ask, path, "GET", API);
    if (typeof seen === "string") { problems.push(seen); continue; }
    const at = `an API client's GET ${path}`;
    const parsed = jsonOf(seen.body);
    const message = typeof parsed?.message === "string" ? parsed.message : "";
    common(at, seen, message, problems);
    if (!/^application\/json\b/i.test(seen.type)) problems.push(`${at}: content-type "${seen.type}", not application/json`);
    if (parsed === undefined) problems.push(`${at}: the body is not a JSON object: ${seen.body.slice(0, 80)}`);
    else if (parsed._tag !== "NotInThisRelease") problems.push(`${at}: _tag ${JSON.stringify(parsed._tag)}, not "NotInThisRelease"`);
    if (parsed !== undefined && typeof parsed.message !== "string") problems.push(`${at}: no message string`);
  }
  return problems;
};

const jsonOf = (body: string): { _tag?: unknown; message?: unknown } | undefined => {
  try { const v: unknown = JSON.parse(body); return typeof v === "object" && v !== null && !Array.isArray(v) ? v as { _tag?: unknown; message?: unknown } : undefined; } catch { return undefined; }
};

const tagOf = (body: string): string | undefined => { try { return (JSON.parse(body) as { _tag?: string })._tag; } catch { return undefined; } };
const thingsOf = (body: string): ReadonlyArray<string> | null => { try { return Object.keys((JSON.parse(body) as { model: { things: object } }).model.things).sort(); } catch { return null; } };

/** The data, as it answers today: the blueprint, the snapshot, an unknown path, and the screens' notice never leaking into any of them. */
export const feed = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  const data = await tried(ask, "/_portal/v1/blueprint");
  if (typeof data === "string") problems.push(data);
  else {
    if (data.status !== 200) problems.push(`blueprint: status ${data.status}, not 200`);
    if (data.etag !== `"${blueprint.digest}"`) problems.push(`blueprint: etag ${String(data.etag)}, not the digest ${blueprint.digest}`);
    if (JSON.stringify(thingsOf(data.body)) !== JSON.stringify(things)) problems.push(`blueprint: its things are ${JSON.stringify(thingsOf(data.body))}, not the model's ${JSON.stringify(things)}`);
    if (/not in this release/i.test(data.body)) problems.push("blueprint: carries the screens' notice");
  }
  const snapshot = await tried(ask, `/_portal/v1/snapshot?digest=${blueprint.digest}`);
  if (typeof snapshot === "string") problems.push(snapshot);
  else {
    if (snapshot.status !== 200) problems.push(`snapshot: status ${snapshot.status}, not 200`);
    if (!/^application\/json\b/i.test(snapshot.type)) problems.push(`snapshot: content-type "${snapshot.type}", not application/json`);
    if (/not in this release/i.test(snapshot.body)) problems.push("snapshot: carries the screens' notice");
  }
  const unknown = await tried(ask, "/_portal/v1/no-such-thing");
  if (typeof unknown === "string") problems.push(unknown);
  else {
    if (unknown.status !== 404) problems.push(`an unknown data path: status ${unknown.status}, not 404`);
    if (tagOf(unknown.body) !== "NotFound") problems.push(`an unknown data path: body is not { _tag: "NotFound" }: ${unknown.body.slice(0, 80)}`);
  }
  return problems;
};

/** Reading only: a POST to the screens or to the data is 405, `allow: GET, HEAD`, as today. */
export const methods = async (ask: Ask): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  for (const path of ["/portal", "/_portal/v1/blueprint"]) {
    const seen = await tried(ask, path, "POST");
    if (typeof seen === "string") { problems.push(seen); continue; }
    if (seen.status !== 405) problems.push(`POST ${path}: status ${seen.status}, not 405`);
    if (seen.allow !== "GET, HEAD") problems.push(`POST ${path}: allow ${String(seen.allow)}, not "GET, HEAD"`);
  }
  return problems;
};

/** A response as `Seen`. */
export const seenOf = async (response: Response): Promise<Seen> => ({
  status: response.status, type: response.headers.get("content-type") ?? "", body: await response.text(), etag: response.headers.get("etag"), allow: response.headers.get("allow"),
});
