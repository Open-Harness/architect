// Screen 1: the app's map, on the app's own page beside its things (K31 "What falls out": "the map's tree on the app's own page,
// beside the things"). Pages as a tree by parent, the navigation groups as the shell shows them, and the selected page's detail.
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { Tree, TreeGroup, TreeItem, TreeItemIndicator, TreeItemLabel } from "@ui-sdk/react/tree";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Frame, Chip, Kpis, Widget } from "./ui.tsx";
import { model, allowedLabel, declaredGroups, declaredPages, derivedGroups, derivedPages, op, type Allowed, type Page } from "./facts.ts";

export type Mode = "derived" | "declared";

const Allowed_ = ({ list }: { list: Allowed[] }) =>
  list.length === 0 ? <span className="muted">not stated in the sketch</span> : <>{list.map((a) => <Chip key={allowedLabel(a)}>{allowedLabel(a)}</Chip>)}</>;

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="row"><dt>{label}</dt><dd>{children}</dd></div>
);

const OpCards = ({ names, via }: { names: string[]; via?: string }) =>
  names.length === 0 ? <span className="muted">Nothing.</span> : (
    <ul className="items">
      {names.map((n) => {
        const o = op(n);
        return (
          <li key={n} className="item">
            <div className="item-head"><span className="mono">{n}</span><span className="who"><Allowed_ list={o.allowed} /></span></div>
            <p>{o.description}</p>
            {via ? <p className="via">through the {via} component</p> : null}
          </li>
        );
      })}
    </ul>
  );

const Detail = ({ page, mode }: { page: Page; mode: Mode }) => (
  <Widget
    title={<><span className="mono">{page.name}</span> <Chip tone="outline">{page.source === "derived" ? "derived" : "sketch"}</Chip></>}
    description={page.description}
  >
    <dl className="rows">
      <Row label="Route"><span className="mono">{page.path}</span><span className="muted"> · typed link </span><span className="mono">{page.link}</span></Row>
      <Row label="Opens from">{page.parent ? <><span className="mono">{page.parent}</span><span className="muted"> (the breadcrumb: {page.parent} › {page.name})</span></> : <span className="muted">it is the home page</span>}</Row>
      <Row label="Who may open it"><Allowed_ list={page.allowed} /></Row>
      <Row label="Shows">{page.shows.length === 0 ? <span className="muted">{mode === "derived" ? "No read. A derived page names none." : "No read of its own."}</span> : page.shows.map((s) => <Chip key={s}><span className="mono">{s}</span></Chip>)}</Row>
      <Row label="Offers"><OpCards names={page.offers} /></Row>
      <Row label="Components">
        {page.components.length === 0 ? <span className="muted">None.</span> : page.components.map((c) => (
          <div key={c.name} className="component">
            <div className="item-head"><span className="mono">{c.name}</span><Chip tone="outline">component</Chip></div>
            <p>{c.description}</p>
            <div className="sub"><span className="muted">shows</span> {c.shows.map((s) => <Chip key={s}><span className="mono">{s}</span></Chip>)}</div>
            <OpCards names={c.offers} via={c.name} />
          </div>
        ))}
      </Row>
    </dl>
    {mode === "derived" && page.offers.length > 0 ? (
      <p className="note">The page is open to anyone, yet some operations it offers are not: the palette and an agent filter each one by its own rule, not the page's.</p>
    ) : null}
  </Widget>
);

const PageItems = ({ pages, parent }: { pages: Page[]; parent?: string }) => (
  <>
    {pages.filter((p) => p.parent === parent).map((p) => {
      const kids = pages.filter((k) => k.parent === p.name);
      return (
        <TreeItem key={p.name} value={p.name}>
          <TreeItemLabel>{kids.length > 0 ? <TreeItemIndicator><ChevronDown aria-hidden="true" /></TreeItemIndicator> : null}<span className="mono">{p.name}</span><span className="route mono">{p.path}</span></TreeItemLabel>
          {kids.length > 0 ? <TreeGroup><PageItems pages={pages} parent={p.name} /></TreeGroup> : null}
        </TreeItem>
      );
    })}
  </>
);

const Groups = ({ groups }: { groups: { title: string; folded: boolean; pages: { page: string; path: string }[] }[] }) => (
  <div className="groups">
    {groups.map((g) => (
      <Collapsible key={g.title} defaultOpen={!g.folded}>
        <CollapsibleTrigger>{g.title}{g.folded ? <span className="muted"> · folded</span> : null}</CollapsibleTrigger>
        <CollapsiblePanel keepMounted>
          <ul className="group-pages">{g.pages.map((p) => <li key={p.page} className="mono">{p.page}</li>)}</ul>
        </CollapsiblePanel>
      </Collapsible>
    ))}
  </div>
);

export const MapScreen = ({ mode, selected, drawer }: { mode: Mode; selected: string; drawer?: ReactNode }) => {
  const pages = mode === "derived" ? derivedPages : declaredPages;
  const groups = mode === "derived" ? derivedGroups : declaredGroups;
  const page = pages.find((p) => p.name === selected)!;
  const offered = pages.reduce((n, p) => n + new Set([...p.offers, ...p.components.flatMap((c) => c.offers)]).size, 0);
  const comps = pages.reduce((n, p) => n + p.components.length, 0);
  return (
    <Frame drawer={drawer} dim={drawer !== undefined}>
      <div className="title">
        <h1>plugged-in</h1>
        <p className="lede">The link-in-bio app, Orthograph's one canon example.</p>
      </div>
      <Tabs defaultValue="map">
        <TabsList aria-label="plugged-in">
          <TabsTab value="things">Things</TabsTab>
          <TabsTab value="map">Map</TabsTab>
        </TabsList>
        <TabsPanel value="things" />
        <TabsPanel value="map">
          <div className="props">
            <Chip>layout <span className="mono">sidebar</span></Chip>
            <Chip>home <span className="mono">/</span></Chip>
            {mode === "derived" ? <Chip tone="outline">derived, not declared</Chip> : <Chip tone="primary">declared (K31's sketch)</Chip>}
          </div>
          <Widget
            title="The map at a glance"
            description={mode === "derived"
              ? "Derived: plugged-in declares no map, so the app projection works one out from the things (a home, a page per thing, a sidebar of the things). It is never written into the model. An agent gets this same map. To declare one, write blueprint/app/ (K31) or run ortho add page."
              : "Declared: the pages the app's author wrote in blueprint/app/. A declared map wins over the derived one. Plugged In has not declared this one yet; it is K31's sketch."}
            className="glance"
            bare
          >
            <Kpis items={[
              { label: "Pages", value: String(pages.length), of: "routes in the map" },
              { label: "Navigation groups", value: String(groups.length), of: "in the sidebar" },
              { label: "Operations offered", value: String(offered), of: `of ${Object.keys(model.operations).length} in the model` },
              { label: "Components", value: String(comps), of: "declared (K36)" },
            ]} />
          </Widget>
          <div className="split">
            <div className="left">
              <Widget title="Pages" description="Each page under the page it opens from, which is also its breadcrumb.">
                <Tree aria-label="Pages" defaultExpanded={["home"]} defaultValue={selected} className="pages-tree">
                  <PageItems pages={pages} parent={undefined} />
                </Tree>
              </Widget>
              <Widget title="Navigation" description="The groups the sidebar shows, in order. A folded group starts closed.">
                <Groups groups={groups} />
              </Widget>
            </div>
            <Detail page={page} mode={mode} />
          </div>
        </TabsPanel>
      </Tabs>
    </Frame>
  );
};
