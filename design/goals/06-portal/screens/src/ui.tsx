// The portal's frame (design/portal.md, "The frame": top bar, icon rail with its panel, reading column) and the few blocks the screens
// share. UI SDK parts for every control (Button, Tabs, Tree); the block frames (Widget, KPI, chips) are the theme's tokens in mock.css,
// because UI SDK has no Widget: that gap is named in the PR.
import type { ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Tree, TreeGroup, TreeItem, TreeItemIndicator, TreeItemLabel } from "@ui-sdk/react/tree";
import { Activity, BookOpen, ChevronDown, Layers, MessageSquare, Plug, Search, ShieldCheck } from "lucide-react";
import { model } from "./facts.ts";

export const Mono = ({ children }: { children: ReactNode }) => <span className="mono">{children}</span>;
export const Chip = ({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "primary" | "outline" }) => (
  <span className={`chip chip-${tone}`}>{children}</span>
);

export const Widget = ({ title, description, children, className = "", bare = false }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string; bare?: boolean }) => (
  <section className={`widget ${className}`}>
    <header className="widget-header">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
    {bare ? children : <div className="widget-content">{children}</div>}
  </section>
);

export const Kpis = ({ items }: { items: { label: string; value: string; of: string }[] }) => (
  <div className="widget-kpis">
    {items.map((k) => (
      <div className="kpi" key={k.label}>
        <span className="kpi-label">{k.label}</span>
        <span className="kpi-value">{k.value}</span>
        <span className="kpi-of">{k.of}</span>
      </div>
    ))}
  </div>
);

const rail = [
  { icon: Layers, label: "Things", on: true },
  { icon: ShieldCheck, label: "Proof" },
  { icon: BookOpen, label: "Reference" },
  { icon: Plug, label: "Plugins and stores" },
  { icon: Activity, label: "Monitor" },
];

/** The things tree beside the page: the app's own page first, then each thing with its operations (portal.md, round 2 Q3). */
const ThingsTree = () => {
  const things = Object.keys(model.things).sort();
  const ops = (t: string) => Object.keys(model.operations).filter((o) => model.operations[o].thing === t).sort();
  return (
    <Tree aria-label="Things" defaultExpanded={["app"]} defaultValue="app" className="things-tree">
      <TreeItem value="app">
        <TreeItemLabel><TreeItemIndicator><ChevronDown aria-hidden="true" /></TreeItemIndicator><Layers aria-hidden="true" /><span>plugged-in</span></TreeItemLabel>
        <TreeGroup>
          {things.map((t) => (
            <TreeItem key={t} value={t}>
              <TreeItemLabel><TreeItemIndicator><ChevronDown aria-hidden="true" /></TreeItemIndicator><span className="mono">{t}</span></TreeItemLabel>
              <TreeGroup>
                {ops(t).map((o) => (
                  <TreeItem key={o} value={o}><TreeItemLabel><span className="mono">{o.split(".")[1]}</span></TreeItemLabel></TreeItem>
                ))}
              </TreeGroup>
            </TreeItem>
          ))}
        </TreeGroup>
      </TreeItem>
    </Tree>
  );
};

export const Frame = ({ children, drawer, dim = false }: { children: ReactNode; drawer?: ReactNode; dim?: boolean }) => (
  <div className={drawer ? "frame clip" : "frame"}>
    <header className="topbar" data-portal="topbar">
      <strong className="app-name">plugged-in</strong>
      <Button aria-label="Environment" className="env"><span className="mono">local</span><span className="muted">last 30 min</span></Button>
      <Button aria-label="Search" className="search"><Search aria-hidden="true" /><span>Go to any thing, page or operation</span><kbd>⌘K</kbd></Button>
      <Button aria-label="As an agent" className="asagent">As an agent</Button>
      <Button aria-label="Chat"><MessageSquare aria-hidden="true" /><span>Chat</span></Button>
    </header>
    <nav className="rail" aria-label="Sections">
      {rail.map(({ icon: I, label, on }) => (
        <span key={label} className={on ? "rail-item on" : "rail-item"} title={label}><I aria-label={label} /></span>
      ))}
    </nav>
    <aside className="panel">
      <h3>Things</h3>
      <ThingsTree />
    </aside>
    <main className="main">{children}</main>
    {dim ? <div className="dim" /> : null}
    {drawer}
  </div>
);
