// /portal/environments/<name>: one page per declared environment (its summary, its declared fields, a proof column for every environment with
// this one in focus), and /portal/compare, the same fields side by side. The environment you are in is read live; another is read in its own portal.
import type { PortalData } from "../types.ts";
import { NOT_YET, environmentOf } from "./live.ts";
import { environmentsOf, type EnvRow } from "./model.ts";
import { Cell, Page } from "./parts.tsx";

const FIELDS = ["runs", "identity", "promotesFrom", "lifetimeMs", "database"] as const;
const valueOf = (e: EnvRow, field: (typeof FIELDS)[number]): string => {
  const v = e[field];
  return v === undefined || v === null ? "none" : String(v);
};

export const EnvironmentPage = ({ data, env }: { readonly data: PortalData; readonly env: EnvRow }) => {
  const { snapshot: s, blueprint } = data;
  const current = environmentOf(data).name;
  const here = current === env.name;
  return (
    <Page status={200} data={data}>
      <h1>{env.name}</h1>
      <div data-portal="env-page" data-environment={env.name} data-live={String(here)}>
        <p data-portal="env-summary" data-runs={env.runs}>{`${env.name} runs ${env.runs}.`}</p>
        <p>{here ? "This portal runs in this environment, so its numbers are read live." : current === NOT_YET ? "This portal has no live source, so it cannot say which environment it runs in: no numbers are read live." : `Another environment: its numbers are read in its own portal, not here. Open the ${env.name} portal for them.`}</p>
        <h2>Declared</h2>
        <dl>{FIELDS.map((f) => <div key={f}><dt>{f}</dt><dd data-portal="env-field" data-field={f} data-value={valueOf(env, f)}>{valueOf(env, f)}</dd></div>)}</dl>
        <h2>Proof</h2>
        <div className="columns">
          {environmentsOf(blueprint).map((e) => (
            <section key={e.name} data-portal="proof-column" data-environment={e.name} data-focus={String(e.name === env.name)}>
              <h3>{e.name}</h3>
              <ul>{s.operations.map((op) => { const p = s.proofs.find((x) => x.operation === op && x.environment === e.name); return <li key={op}>{`${op} `}{p === undefined ? null : <Cell proof={p} />}</li>; })}</ul>
            </section>
          ))}
        </div>
      </div>
    </Page>
  );
};

export const ComparePage = ({ data }: { readonly data: PortalData }) => {
  const envs = environmentsOf(data.blueprint);
  return (
    <Page status={200} data={data}>
      <h1>Compare environments</h1>
      <p>What each declared environment says, side by side.</p>
      <table>
        <thead><tr><th>Field</th>{envs.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
        <tbody>{FIELDS.map((f) => <tr key={f}><td>{f}</td>{envs.map((e) => <td key={e.name}>{valueOf(e, f)}</td>)}</tr>)}</tbody>
      </table>
    </Page>
  );
};
