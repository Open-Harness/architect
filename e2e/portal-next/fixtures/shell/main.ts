// The fixture app of the shell's check (e2e/portal-next/shell/shell.test.ts): `@orthograph/shell` mounted over the generated app data
// the test puts on `window.__DATA__`, a body for each page, and text for each slot. Not typechecked (it needs the shell).
import { mountShell } from "@orthograph/shell";

const data = (window as unknown as { __DATA__: Record<string, any> }).__DATA__;
const paint = (html: string) => (el: HTMLElement) => { el.innerHTML = html; };
const pages = Object.fromEntries(
  data["routes"].routes.map((r: { page: string }) => [
    r.page,
    (el: HTMLElement, params: Record<string, string>) => { el.innerHTML = `<h1 data-fixture-page="${r.page}">${r.page}</h1><pre data-fixture-params>${JSON.stringify(params)}</pre>`; },
  ]),
);
const slots = data["slots"] === false ? {} : { header: paint("slot-header"), switcher: paint("slot-switcher"), footer: paint("slot-footer"), actions: paint("slot-actions") };

(window as unknown as { __shell: unknown; __loads: number }).__loads = 1;
(window as unknown as { __shell: unknown }).__shell = mountShell(document.getElementById("root") as HTMLElement, {
  routes: data["routes"], navigation: data["navigation"], palette: data["palette"], map: data["map"], caller: data["caller"], pages, slots,
});
