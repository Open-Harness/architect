// /portal/reference/<access|refusals|events|values|machines>: the model's tables, one page each. Refusal codes are counted by name and code;
// a refusal the door gave opens no span, and its row says `no span`.
import type { PortalData } from "../types.ts";
import { refusalCount, refusalTotals, whyNot } from "./live.ts";
import { eventsOf, refusalsOf } from "./model.ts";
import { NotYet } from "./not-yet.tsx";
import { refusalOwners } from "./rules.ts";
import { Refusal } from "./rules.tsx";
import { Page, Table, who } from "./parts.tsx";

type Kind = "access" | "refusals" | "events" | "values" | "machines";
const TITLE: Readonly<Record<Kind, string>> = { access: "Access", refusals: "Refusal codes", events: "Events", values: "Values", machines: "Machines" };

const Body = ({ data, kind }: { readonly data: PortalData; readonly kind: Kind }) => {
  const { blueprint } = data;
  const things = Object.values(blueprint.model.things);
  if (kind === "access") {
    return <Table head={["Operation", "Who may call"]} rows={Object.values(blueprint.model.operations).map((o) => [<a href={`/portal/operations/${o.name}`}>{o.name}</a>, who(o)])} />;
  }
  if (kind === "refusals") {
    const why = whyNot(data, "metrics");
    const owners = refusalOwners(blueprint);
    return (
      <>
      {why === undefined ? null : <p>Counts: <NotYet hole="metrics" what={why} /></p>}
      <table>
        <thead><tr><th>Refusal</th><th>Code</th><th>Count</th><th>Trace</th></tr></thead>
        <tbody>
          {Object.entries(refusalsOf(blueprint)).map(([name, code]) => {
            const count = refusalCount(data, name);
            const totals = refusalTotals(data, name);
            const trace = totals?.trace ?? null;
            // Whether a refusal opened a span is known only when the spans were read: `door` is null exactly when they were not.
            const spansRead = totals !== undefined && totals.door !== null;
            // No metrics source: no count, no span claim, and the cells say `not yet`.
            return count === null ? (
              <tr key={name} data-portal="ref-row" data-name={name} data-code={code}><td><Refusal name={name} owner={owners.get(name)} /></td><td>{code}</td><td>not yet</td><td>not yet</td></tr>
            ) : (
              <tr key={name} data-portal="ref-row" data-name={name} data-code={code} data-count={String(count)} {...(!spansRead && trace === null ? {} : { "data-span": trace === null ? "none" : "trace" })} {...(trace === null ? {} : { "data-trace": trace })}>
                <td><Refusal name={name} owner={owners.get(name)} /></td><td>{code}</td><td>{count}</td><td>{trace !== null ? <a href={`/portal/traces/${trace}`}>open the trace</a> : spansRead ? "no span" : "not yet"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </>
    );
  }
  if (kind === "events") {
    return <ul>{things.flatMap((t) => eventsOf(t).map(([name, fields]) => <li key={name}>{`${name} (${t.name}): ${Object.keys(fields).join(", ")}`}</li>))}</ul>;
  }
  if (kind === "machines") {
    return <ul>{things.filter((t) => t.machine !== null).map((t) => <li key={t.name}><a href={`/portal/things/${t.name}`}>{t.name}</a>{`: ${t.machine!.states.join(", ")}`}</li>)}</ul>;
  }
  return <p>The values the blueprint names: <NotYet hole="values" what="the wire does not carry them yet (M1.42)" /></p>;
};

export const ReferencePage = ({ data, kind }: { readonly data: PortalData; readonly kind: Kind }) => (
  <Page status={200} data={data}>
    <h1>{TITLE[kind]}</h1>
    <Body data={data} kind={kind} />
  </Page>
);
