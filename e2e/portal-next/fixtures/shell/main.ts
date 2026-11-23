// The fixture app of the shell's checks (e2e/portal-next/shell/): `@orthograph/shell` mounted over the generated app data the test puts on
// `window.__DATA__`, a body for each page, text for each slot, and, when the test asks, extra palette rows from a source it can change
// (`__setExtra`), an app-drawn 404, and a page that reads `?tab=`. Not typechecked (it needs the shell).
import { mountShell } from "@orthograph/shell";

type Any = Record<string, any>;
const g = globalThis as unknown as Any;
const data = g["__DATA__"] as Any;
const paint = (html: string) => (el: HTMLElement) => { el.innerHTML = html; };
const pages = Object.fromEntries(
  data["routes"].routes.map((r: { page: string }) => [
    r.page,
    (el: HTMLElement, params: Record<string, string>, search?: URLSearchParams) => {
      g["__paints"] = (g["__paints"] ?? 0) + 1;
      el.innerHTML = `<h1 data-fixture-page="${r.page}">${r.page}</h1><pre data-fixture-params>${JSON.stringify(params)}</pre><pre data-fixture-search>${search?.toString() ?? ""}</pre><pre data-fixture-tab>${search?.get("tab") ?? ""}</pre><pre data-fixture-paints>${String(g["__paints"])}</pre>`;
    },
  ]),
);
const slots = data["slots"] === false ? {} : { header: paint("slot-header"), switcher: paint("slot-switcher"), footer: paint("slot-footer"), actions: paint("slot-actions") };

// Extra palette rows: serializable rows from the test, a `run` that records its name, and a source whose rows the test can replace.
g["__ran"] = [];
const toRow = (r: Any) => ({ ...r, ...(r.runs === true ? { run: () => { g["__ran"].push(r.name); } } : {}) });
let rows = ((data["extras"] ?? []) as Any[]).map(toRow);
const listeners = new Set<() => void>();
const extra = { read: () => rows, subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; } };
g["__setExtra"] = (next: Any[]) => { rows = next.map(toRow); for (const l of listeners) l(); };

// The app's own 404: it paints the address it was asked for, so a repaint on a changed address shows.
const notFound = (el: HTMLElement) => { el.innerHTML = `<h1 data-fixture-404>custom 404</h1><pre data-fixture-404-path>${location.pathname}${location.search}</pre>`; };

g["__loads"] = 1;
g["__shell"] = mountShell(document.getElementById("root") as HTMLElement, {
  routes: data["routes"], navigation: data["navigation"], palette: data["palette"], map: data["map"], caller: data["caller"], roles: data["roles"], pages, slots,
  ...(data["extras"] === undefined ? {} : { extra }),
  ...(data["notFound"] === true ? { notFound } : {}),
});
