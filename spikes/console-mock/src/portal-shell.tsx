// The portal's frame for the ST1.22 screens (design/portal.md "The frame"): a tree of things and their operations on the left, a top bar,
// one reading column. Every name in the tree is Plugged In's own (generated/portal/blueprint.json, `model.things` and `model.operations`).
import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Chip, Kbd, SearchField } from "@heroui/react";
import { CaretRightIcon, CubeIcon, FileTextIcon, GaugeIcon, ListChecksIcon, StackIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

const tree: { thing: string; ops: string[] }[] = [
  { thing: "profile", ops: ["get"] },
  { thing: "link", ops: ["add", "order", "remove"] },
  { thing: "handle", ops: ["claim", "release", "resolve"] },
];

export const PortalShell = ({ active, crumbs, children }: { active: string; crumbs: string[]; children: ReactNode }) => (
  <AppLayout
    className="console-layout"
    sidebarCollapsible="icon"
    sidebar={
      <Sidebar aria-label="Portal">
        <Sidebar.Header>
          <a href="#home" className="project-home">
            <span className="project-mark"><CubeIcon size={18} weight="bold" aria-hidden="true" /></span>
            <span className="project-text"><span className="project-name">plugged-in</span><span className="project-env">local · stage 1</span></span>
          </a>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Things</Sidebar.GroupLabel>
            <Sidebar.Menu aria-label="Things and their operations">
              {tree.flatMap(({ thing, ops }) => [
                <Sidebar.MenuItem key={thing} id={thing} href="#thing" textValue={thing} isCurrent={active === thing}>
                  <Sidebar.MenuIcon><StackIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>{thing}</Sidebar.MenuLabel>
                </Sidebar.MenuItem>,
                ...ops.map((op) => (
                  <Sidebar.MenuItem key={`${thing}.${op}`} id={`${thing}.${op}`} href="#operation" textValue={op} isCurrent={active === `${thing}.${op}`} className="tree-op">
                    <Sidebar.MenuIcon><ListChecksIcon size={16} aria-hidden="true" /></Sidebar.MenuIcon>
                    <Sidebar.MenuLabel>{op}</Sidebar.MenuLabel>
                  </Sidebar.MenuItem>
                )),
              ])}
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Reference</Sidebar.GroupLabel>
            <Sidebar.Menu aria-label="Reference">
              <Sidebar.MenuItem id="refusals" href="#refusals" textValue="Refusal codes"><Sidebar.MenuIcon><FileTextIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Refusal codes</Sidebar.MenuLabel></Sidebar.MenuItem>
              <Sidebar.MenuItem id="monitor" href="#monitor" textValue="Monitor"><Sidebar.MenuIcon><GaugeIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Monitor</Sidebar.MenuLabel></Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer><div className="harness-status"><span className="harness-text"><strong>Any thing, operation or code</strong><small>⌘K goes to it</small></span></div></Sidebar.Footer>
      </Sidebar>
    }
    navbar={
      <Navbar maxWidth="full" className="layout-navbar">
        <Navbar.Header>
          <Sidebar.Trigger aria-label="Toggle sidebar" />
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c} className="crumb">{i > 0 && <CaretRightIcon size={12} aria-hidden="true" />}<span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</span></span>
            ))}
          </nav>
          <Navbar.Spacer />
          <Chip size="sm" variant="soft">local</Chip>
          <SearchField aria-label="Search the model" className="nav-search">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Go to any thing, operation or code" /><Kbd>⌘K</Kbd></SearchField.Group>
          </SearchField>
        </Navbar.Header>
      </Navbar>
    }
  >
    <div className="layout-content">{children}</div>
  </AppLayout>
);
