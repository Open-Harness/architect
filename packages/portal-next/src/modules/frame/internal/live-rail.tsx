// The live rail, scoped to the page: every operation on home, a thing's operations on its page. Its numbers come only from the window's own counts
// (`ortho.calls`), and its last calls from the window's spans; where there is no source it says `not yet` and why, and draws no number.
import { Live } from "../../live/service.ts";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";
import { Link } from "./link.tsx";

const NotYet = ({ hole, what }: { readonly hole: string; readonly what: string }) => (
  <span data-portal="not-yet" data-hole={hole}>not yet<span className="meta">{` (${what})`}</span></span>
);

export const LiveRail = ({ data, scope, operations }: { readonly data: PortalData; readonly scope: string; readonly operations?: ReadonlyArray<string> | undefined }) => {
  const { links } = useEnv();
  const tally = Live.tallyOf(data, operations);
  const noNumbers = Live.whyNot(data, "metrics");
  const noCalls = Live.whyNot(data, "calls");
  const last = Live.lastCalls(data, operations);
  return (
    <aside data-portal="rail" data-scope={scope} aria-label="Live">
      {noNumbers !== undefined
        ? <NotYet hole="metrics" what={noNumbers} />
        : (["calls", "answered", "refused", "defects"] as const).map((s) => (
          <div key={s} className="stat"><span className="meta">{s}</span> <b data-portal="stat" data-stat={s} data-value={tally[s]}>{tally[s]}</b></div>
        ))}
      <div className="meta">Last calls</div>
      {noCalls !== undefined ? <NotYet hole="calls" what={noCalls} /> : last.length === 0 ? <p className="meta">No call in the window.</p> : null}
      {last.map((c) => (
        <Link key={c.trace} href={links.trace({ id: c.trace })} data-portal="last-call" data-trace={c.trace} data-operation={c.operation} data-outcome={c.outcome} data-caller-kind={c.caller} data-attempts={String(c.attempts)}>
          {`${c.operation} ${c.outcome}, ${c.caller}, ${String(c.durationMs)} ms`}
        </Link>
      ))}
    </aside>
  );
};
