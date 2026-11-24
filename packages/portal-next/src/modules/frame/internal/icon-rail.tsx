// The icon rail: one icon for each group of the app's navigation, in the order the map declares them, and under them the short panel of pages
// each opens. Every panel is in the page (closed ones hidden), so a person, a search and an agent can reach any page of any panel. The open
// panel is remembered across pages: a page is drawn afresh on every move, the rail is not.
import { useState } from "react";
import { Panels } from "../../panels/service.ts";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";
import { Link } from "./link.tsx";

let remembered: string | null = null;

const LABEL = (panel: string): string => `${panel.slice(0, 1).toUpperCase()}${panel.slice(1)}`;

export const IconRail = ({ data }: { readonly data: PortalData }) => {
  const { navigation, links } = useEnv();
  const [open, setOpen] = useState<string | null>(remembered);
  const pages = Panels.pages(navigation, links, data.blueprint);
  const choose = (panel: string): void => {
    const next = open === panel ? null : panel;
    remembered = next;
    setOpen(next);
  };
  return (
    <nav data-portal="icon-rail" aria-label="Portal">
      {navigation.groups.map((group) => (
        <button key={group.title} type="button" data-portal="rail-icon" data-panel={group.title} aria-expanded={open === group.title} onClick={() => { choose(group.title); }}>{LABEL(group.title)}</button>
      ))}
      {navigation.groups.map((group) => (
        <ul key={group.title} data-portal="panel" data-panel={group.title} data-open={String(open === group.title)} hidden={open !== group.title}>
          {pages.filter((p) => p.panel === group.title).map((p) => (
            <li key={p.href}><Link data-portal="panel-page" data-panel={p.panel} data-title={p.title} data-href={p.href} href={p.href}>{p.title}</Link></li>
          ))}
          <li className="hint">Any thing, operation, code or page: ⌘K</li>
        </ul>
      ))}
    </nav>
  );
};
