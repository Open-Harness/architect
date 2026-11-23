// The frame every page sits in: the top bar (the environment, its picker, ⌘K), the icon rail with its panels, the things tree and the
// live rail. Plain elements with `data-portal` hooks, like the pages; no heading in the frame, so a page's own headings stay its own.
import { useEffect, useState, type ReactNode } from "react";
import type { PortalData } from "../types.ts";
import { environmentsOf } from "./model.ts";
import { environmentOf, lastCalls, tallyOf, whyNot, NOT_YET } from "./live.ts";
import { PANELS, panelPages, searchIndex, type PanelName } from "./nav.ts";
import { NotYet } from "./not-yet.tsx";

const LABEL: Readonly<Record<PanelName, string>> = { things: "Things", proof: "Proof", reference: "Reference", plugins: "Plugins", monitor: "Monitor" };

const Search = ({ data }: { readonly data: PortalData }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, []);
  const index = searchIndex(data.blueprint);
  const found = index.filter((e) => `${e.kind} ${e.name} ${e.code ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  return (
    <>
      <button type="button" data-portal="search-trigger" data-shortcut="⌘K" onClick={() => { setOpen(true); }}>Search <kbd>⌘K</kbd></button>
      <script type="application/json" data-portal="search-index">{JSON.stringify(index)}</script>
      {open ? (
        <div data-portal="search-box" role="dialog" aria-label="Search">
          <input autoFocus value={query} placeholder="Things, operations, journeys, refusal codes, environments" onChange={(e) => { setQuery(e.target.value); }} />
          <ul>{found.map((e) => <li key={`${e.kind}:${e.name}`}><a href={e.href}>{e.name}</a>{` ${e.kind}${e.code === undefined ? "" : ` ${e.code}`}`}</li>)}</ul>
        </div>
      ) : null}
    </>
  );
};

const TopBar = ({ data }: { readonly data: PortalData }) => {
  const env = environmentOf(data);
  return (
    <header data-portal="top-bar" data-environment={env.name} data-window-ms={env.windowMs}>
      <a href="/portal" className="brand">{data.blueprint.project}</a>
      <span data-portal="env-picker">
        <span className="meta">Environment</span>
        {environmentsOf(data.blueprint).map((e) => (
          <a key={e.name} data-portal="env-option" data-environment={e.name} data-href={`/portal/environments/${e.name}`} data-current={String(e.name === env.name)} href={`/portal/environments/${e.name}`}>{e.name}</a>
        ))}
      </span>
      <Search data={data} />
    </header>
  );
};

const IconRail = ({ data }: { readonly data: PortalData }) => {
  const [open, setOpen] = useState<PanelName | null>(null);
  const pages = panelPages(data.blueprint);
  return (
    <nav data-portal="icon-rail" aria-label="Portal">
      {PANELS.map((panel) => (
        <button key={panel} type="button" data-portal="rail-icon" data-panel={panel} aria-expanded={open === panel} onClick={() => { setOpen(open === panel ? null : panel); }}>{LABEL[panel]}</button>
      ))}
      {PANELS.map((panel) => (
        <ul key={panel} data-portal="panel" data-open={String(open === panel)} hidden={open !== panel}>
          {pages.filter((p) => p.panel === panel).map((p) => <li key={p.href}><a data-portal="panel-page" data-panel={panel} data-title={p.title} data-href={p.href} href={p.href}>{p.title}</a></li>)}
        </ul>
      ))}
    </nav>
  );
};

const Tree = ({ data }: { readonly data: PortalData }) => (
  <aside data-portal="tree" aria-label="Things">
    {Object.values(data.blueprint.model.things).map((t) => (
      <div key={t.name}>
        <a data-portal="tree-item" data-kind="thing" data-name={t.name} href={`/portal/things/${t.name}`}>{t.name}</a>
        {Object.values(data.blueprint.model.operations).filter((o) => o.thing === t.name).map((o) => (
          <a key={o.name} data-portal="tree-item" data-kind="operation" data-name={o.name} className="sub" href={`/portal/operations/${o.name}`}>{o.verb}</a>
        ))}
      </div>
    ))}
  </aside>
);

/** The live rail, scoped to the page: every operation on home, a thing's operations on its page. Numbers only from the window's own counts. */
export const Rail = ({ data, scope, operations }: { readonly data: PortalData; readonly scope: string; readonly operations?: ReadonlyArray<string> }) => {
  const tally = tallyOf(data, operations);
  const noNumbers = whyNot(data, "metrics");
  const noCalls = whyNot(data, "calls");
  const last = lastCalls(data, operations);
  return (
    <aside data-portal="rail" data-scope={scope} aria-label="Live">
      {noNumbers !== undefined
        ? <NotYet hole="metrics" what={noNumbers} />
        : (["calls", "answered", "refused", "defects"] as const).map((s) => <div key={s}><span className="meta">{s}</span> <b data-portal="stat" data-stat={s} data-value={tally[s]}>{tally[s]}</b></div>)}
      <div className="meta">Last calls</div>
      {noCalls !== undefined ? <NotYet hole="calls" what={noCalls} /> : last.length === 0 ? <p className="meta">No call in the window.</p> : null}
      {last.map((c) => (
        <a key={c.trace} href={`/portal/traces/${c.trace}`} data-portal="last-call" data-trace={c.trace} data-operation={c.operation} data-outcome={c.outcome} data-caller-kind={c.caller} data-attempts={String(c.attempts)}>
          {`${c.operation} ${c.outcome}, ${c.caller}, ${c.durationMs} ms`}
        </a>
      ))}
    </aside>
  );
};

export const Chrome = ({ data, scope, operations, children }: { readonly data: PortalData; readonly scope: string; readonly operations?: ReadonlyArray<string>; readonly children: ReactNode }) => (
  <div className="shell">
    <TopBar data={data} />
    <IconRail data={data} />
    <Tree data={data} />
    <div className="content">{children}</div>
    <Rail data={data} scope={scope} {...(operations === undefined ? {} : { operations })} />
  </div>
);

export { NOT_YET };
