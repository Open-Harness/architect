// Check 38's judge (M1.12a): reads the calls table of an operation's Metrics tab in a served portal, the way a person does. It reads each row's
// request key (the attribute and the cell under the `request-key` column), then types each term into the request-key filter and reads
// the rows again. It judges a portal against a window the check made; it never asks the portal what the key should be. The real portal is
// judged in CI, where the client is built; a stand-in client (`request-key-standin.ts`) lets every fault the judge must catch be planted here.
import type { ServedPortal } from "../served-portal/types.ts";

/** What a keyless row shows in a window where some calls carry a key. Pinned here: the portal's design says nothing else (`none`, not `not yet`: the portal knows the call had no key). */
export const NO_KEY = "none";

export interface Expected {
  /** The calls in the window, newest first, each with the key its spans carry (`null`: none). */
  readonly calls: ReadonlyArray<{ readonly trace: string; readonly key: string | null }>;
  /** Each term typed into the filter, and the traces that must remain, newest first. */
  readonly terms: ReadonlyArray<readonly [string, ReadonlyArray<string>]>;
}

interface Row { readonly trace: string | null; readonly attr: string | null; readonly cell: string | null }
interface Seen {
  readonly column: number;
  readonly filters: ReadonlyArray<string>;
  readonly available: string | null;
  readonly visible: boolean;
  readonly initial: ReadonlyArray<Row>;
  readonly terms: Readonly<Record<string, ReadonlyArray<Row>>>;
}

const expression = (terms: ReadonlyArray<string>) => `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const columns = [...document.querySelectorAll('[data-portal="calls-col"]')];
  const column = columns.findIndex((c) => c.getAttribute("data-col") === "request-key");
  const read = () => [...document.querySelectorAll('[data-portal="call-row"]')].map((row) => ({
    trace: row.getAttribute("data-trace"), attr: row.getAttribute("data-request-key"), cell: column < 0 ? null : (row.children[column]?.textContent ?? null),
  }));
  const filter = () => document.querySelector('[data-portal="calls-filter"][data-filter="request-key"]');
  const input = () => filter()?.querySelector("input") ?? null;
  const seen = {
    column, filters: [...document.querySelectorAll('[data-portal="calls-filter"]')].map((f) => f.getAttribute("data-filter")),
    available: filter()?.getAttribute("data-available") ?? null, visible: !!input() && input().getClientRects().length > 0, initial: read(), terms: {},
  };
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  for (const term of ${JSON.stringify(terms)}) {
    const field = input();
    if (!field) break;
    set.call(field, term);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(150);
    seen.terms[term] = read();
  }
  return seen;
})()`;

const list = (rows: ReadonlyArray<{ readonly trace: string | null }>) => rows.map((r) => String(r.trace).slice(0, 6)).join(", ") || "(none)";

/** The faults a portal's calls table has against the window, as sentences; none means it is right. */
export const judge = async (portal: ServedPortal, route: string, expected: Expected): Promise<ReadonlyArray<string>> => {
  const seen = await portal.evaluate<Seen>(route, expression(expected.terms.map(([term]) => term)));
  const found: Array<string> = [];
  if (seen.column < 0) found.push("the calls table has no `request-key` column");
  if (!seen.filters.includes("request-key")) found.push("the calls table has no `request-key` filter");
  if (seen.available !== "true") found.push(`the request-key filter says data-available="${String(seen.available)}" in a window whose calls carry keys`);
  if (!seen.visible) found.push("the request-key filter has no visible `input` to type a part of a key into");
  if (seen.initial.map((r) => r.trace).join() !== expected.calls.map((c) => c.trace).join()) found.push(`the rows are [${list(seen.initial)}]; the window's calls, newest first, are [${list(expected.calls)}]`);
  for (const call of expected.calls) {
    const row = seen.initial.find((r) => r.trace === call.trace);
    if (row === undefined) continue;
    const shown = call.key ?? NO_KEY;
    if (row.attr !== shown) found.push(`call ${call.trace.slice(0, 6)}: data-request-key is "${String(row.attr)}"; it was made with ${call.key === null ? "no key, which reads \"" + NO_KEY + "\"" : `the key "${call.key}"`}`);
    if (row.cell?.trim() !== shown) found.push(`call ${call.trace.slice(0, 6)}: the request-key cell reads "${String(row.cell?.trim())}", not "${shown}"`);
  }
  for (const [term, traces] of expected.terms) {
    const rows = seen.terms[term];
    if (rows === undefined) { found.push(`typing "${term}" into the request-key filter was not possible`); continue; }
    if (rows.map((r) => r.trace).join() !== traces.join()) found.push(`the request-key filter "${term}" leaves [${list(rows)}]; the keys that contain it belong to [${traces.map((t) => t.slice(0, 6)).join(", ") || "(none)"}]`);
  }
  return found;
};
