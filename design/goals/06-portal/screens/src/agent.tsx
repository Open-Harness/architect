// Screen 2: the agent's view, as the grill's option C draws it: a drawer from the top bar that shows what an agent sees of the page you
// are on. Two sources only: the map (where it can go) and UI SDK's `snapshot()` (what it can touch here). Rows that today's shell
// really returns are read from derived/snapshot-closed.json; rows the portal will add in slice 11 are marked as such.
import { Button } from "@ui-sdk/react/button";
import { Chip } from "./ui.tsx";
import { derivedPalette, op, snapshotClosed, allowedLabel } from "./facts.ts";

/** What slice 11 says the portal's snapshot must also list ("the search, the tree, the tabs and the environment picker"), by the names the screen gives them. */
const slice11 = [
  { component: "command", label: "Search", actions: ["setValue", "setQuery", "run"] },
  { component: "select", label: "Environment", actions: ["setValue"] },
  { component: "tree", label: "Things tree", actions: ["setValue"] },
  { component: "tabs", label: "plugged-in sections", actions: ["setValue"] },
];

const Row = ({ ref_, component, label, actions, target }: { ref_?: string; component: string; label: string; actions: string[]; target?: boolean }) => (
  <tr>
    <td className="mono muted">{ref_ ?? "·"}</td>
    <td className="mono">{component}</td>
    <td>{label}</td>
    <td className="mono muted">{actions.join(" ")}</td>
    <td>{target ? <Chip tone="primary">slice 11</Chip> : <Chip>today</Chip>}</td>
  </tr>
);

export const AgentDrawer = () => {
  // "Where it can go": the palette's pages for a signed-in person, and the operations that page offers where the agent is (home offers none).
  const pages = derivedPalette.filter((e) => e.kind === "page");
  const here = derivedPalette.filter((e) => e.kind === "operation" && e.page === "home");
  const claim = op("handle.release");
  return (
    <aside className="drawer" aria-label="As an agent">
      <header className="drawer-head">
        <div>
          <h2>As an agent</h2>
          <p>What an agent sees on this page: the map for where it can go, and the same list <span className="mono">snapshot()</span> gives it for what it can touch.</p>
        </div>
        <Button aria-label="Close">Close</Button>
      </header>
      <section className="drawer-sec">
        <h3>Where it can go</h3>
        <p className="sub-d">Pages a signed-in person may open, from the palette's index. A step to any other is refused before a call is made.</p>
        <ul className="chips">{pages.map((p) => <li key={p.name}><Chip><span className="mono">{p.name}</span> <span className="muted mono">{p.path}</span></Chip></li>)}</ul>
        <p className="sub-d">Operations offered where it is now: {here.length === 0 ? "none. This page offers none; open a thing's page to see its operations." : here.length}</p>
      </section>
      <section className="drawer-sec">
        <h3>What it can touch here</h3>
        <p className="sub-d">One row per UI SDK component, named the way an agent asks for it. A control without a name is not listed, so it cannot be used.</p>
        <table className="snap">
          <thead><tr><th>Ref</th><th>Component</th><th>Name</th><th>Actions</th><th>Status</th></tr></thead>
          <tbody>
            {snapshotClosed.map((e) => <Row key={e.ref} ref_={e.ref} component={e.component} label={e.label} actions={e.actions} />)}
            {slice11.map((e) => <Row key={e.label} component={e.component} label={e.label} actions={e.actions} target />)}
          </tbody>
        </table>
      </section>
      <section className="drawer-sec">
        <h3>Needs a person</h3>
        <p className="sub-d">Anything marked as needing a yes. Nothing on this page is. On the <span className="mono">handle</span> page this would list:</p>
        <div className="confirm">
          <span className="mono">handle.release</span><Chip>{allowedLabel(claim.allowed[0]!)}</Chip>
          <p>{claim.description}</p>
        </div>
      </section>
    </aside>
  );
};
