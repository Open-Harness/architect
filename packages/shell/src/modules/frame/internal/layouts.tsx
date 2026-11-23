// The three layouts (K31 section 3). Each draws the same parts in its own places: the navigation in its region, the named slots around it, the
// breadcrumb and the page in the middle. `none` is only the page: no region, no slot, no breadcrumb.
import type { ReactNode } from "react";
import type { NavGroup } from "../../navigation/types.ts";
import type { Layout } from "../../navigation/types.ts";
import type { Slots } from "../types.ts";
import { Breadcrumb, type Crumb } from "./breadcrumb.tsx";
import { Nav } from "./nav.tsx";
import { Slot } from "./slot.tsx";

export interface Parts {
  readonly groups: ReadonlyArray<NavGroup>;
  readonly crumbs: ReadonlyArray<Crumb>;
  readonly slots: Slots;
  readonly page: ReactNode;
  /** The palette's button (and the dialog it opens); drawn in the bar, or beside the page in `none`. */
  readonly palette: ReactNode;
}

const Sidebar = ({ groups, slots, crumbs, page, palette }: Parts) => (
  <>
    <aside data-shell="sidebar">
      <Slot name="header" fill={slots.header} />
      <Slot name="switcher" fill={slots.switcher} />
      <Slot name="nav">
        <Nav groups={groups} orientation="vertical" />
      </Slot>
      <Slot name="footer" fill={slots.footer} />
    </aside>
    <div data-shell="main">
      <div data-shell="bar">
        <Breadcrumb crumbs={crumbs} />
        {palette}
        <Slot name="actions" fill={slots.actions} />
      </div>
      {page}
    </div>
  </>
);

const TopNav = ({ groups, slots, crumbs, page, palette }: Parts) => (
  <>
    <header data-shell="topbar">
      <Slot name="header" fill={slots.header} />
      <Slot name="switcher" fill={slots.switcher} />
      <Slot name="nav">
        <Nav groups={groups} orientation="horizontal" />
      </Slot>
      {palette}
      <Slot name="actions" fill={slots.actions} />
    </header>
    <div data-shell="main">
      <Breadcrumb crumbs={crumbs} />
      {page}
      <Slot name="footer" fill={slots.footer} />
    </div>
  </>
);

export const Layouts = ({ layout, parts }: { readonly layout: Layout; readonly parts: Parts }) => {
  if (layout === "none") {
    return (
      <>
        {parts.page}
        {parts.palette}
      </>
    );
  }
  return layout === "topNav" ? <TopNav {...parts} /> : <Sidebar {...parts} />;
};
