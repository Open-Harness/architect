// /portal/monitor/alerts and /portal/monitor/issues (M1.49, K18): what the model says to watch, as the environment reads it now. Both are drawn from
// `/_portal/v1/monitor` alone, at the window's `now`. Nothing here is sent anywhere: the Alerts page says so, and says which environment it is.
import type { AlertRow, IssueRow } from "#modules/monitor/types.js";
import type { AlertRuleWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { NotYet } from "./not-yet.tsx";
import { Page } from "./parts.tsx";

const rulesOf = (data: PortalData): ReadonlyMap<string, AlertRuleWire> => new Map((data.blueprint.model.alertRules ?? []).map((r) => [r.id, r]));
const subjectOf = (r: AlertRuleWire) => r.labels["operation"] ?? r.labels["code"] ?? r.labels["journey"] ?? "";
const iso = (at: number) => new Date(at).toISOString();

/** Firing pages first, then firing tickets, then the rest; a tie keeps the rules' own order, so two reads of one window draw the same page. */
const rank = (a: AlertRow) => (a.state === "firing" ? (a.severity === "page" ? 0 : 1) : 2);
export const worstFirst = (alerts: ReadonlyArray<AlertRow>): ReadonlyArray<AlertRow> => [...alerts].sort((a, b) => rank(a) - rank(b));

const Why = ({ hole }: { readonly hole: string }) => <p>The monitor: <NotYet hole={hole} what="this portal has no live source to evaluate the rules over" /></p>;

const AlertLine = ({ alert, rule }: { readonly alert: AlertRow; readonly rule: AlertRuleWire | undefined }) => {
  const subject = rule === undefined ? alert.rule : subjectOf(rule);
  const owner = rule?.labels["owner"] ?? "unknown";
  return (
    <li data-portal="alert-row" data-rule={alert.rule} data-alert={alert.alert} data-kind={rule?.kind ?? "unknown"} data-subject={subject} data-severity={alert.severity} data-owner={owner} data-state={alert.state}>
      <b>{subject}</b>{" "}<span>{alert.alert}</span>{" "}<span className={`state-${alert.state}`}>{alert.state}</span>{" "}<span>{alert.severity}</span>{" "}<i>{owner}</i>
      {alert.windows === undefined ? null : <span className="meta">{" "}{alert.windows.map((w) => `${w.bad} of ${w.calls} calls bad in ${w.ms / 60_000} min`).join(", ")}</span>}
    </li>
  );
};

export const AlertsPage = ({ data }: { readonly data: PortalData }) => {
  const { monitor } = data;
  const rules = rulesOf(data);
  return (
    <Page status={200} data={data} scope="all">
      <h1>Alerts</h1>
      {monitor === null ? <Why hole="alerts" /> : (
        <>
          <p data-portal="alerts-delivery" data-sent="false" data-environment={monitor.environment}>
            {`${monitor.environment}: Shown here. Not sent.`}
          </p>
          <p className="meta">{`Each alert is one burn of an objective the model derives, evaluated over the window ending ${iso(monitor.now)}. A rule with no burn to read is unknown, never ok.`}</p>
          <ul className="alerts">{worstFirst(monitor.alerts).map((a) => <AlertLine key={`${a.rule}|${a.alert}`} alert={a} rule={rules.get(a.rule)} />)}</ul>
        </>
      )}
    </Page>
  );
};

const IssueLine = ({ issue }: { readonly issue: IssueRow }) => (
  <li
    data-portal="issue-row" data-key={issue.key} data-operation={issue.operation} data-step={issue.step} data-tag={issue.tag} data-owner={issue.owner} data-occurrences={issue.occurrences}
    data-first-seen={issue.firstSeen.at} data-first-hash={issue.firstSeen.hash} data-last-seen={issue.lastSeen.at} data-last-hash={issue.lastSeen.hash} data-regressed={String(issue.regressed)}
  >
    <b>{issue.key}</b>{" "}<span>{issue.occurrences}</span>{" "}<span>{iso(issue.firstSeen.at)}</span>{" "}<span>{iso(issue.lastSeen.at)}</span>{" "}<i>{issue.owner}</i>
    {issue.regressed ? <>{" "}<span data-portal="regressed-badge" className="badge-regressed">regressed</span></> : null}
    <span className="meta">{` first seen under ${issue.firstSeen.hash || "an unknown declaration"}, last under ${issue.lastSeen.hash || "an unknown declaration"}`}</span>
  </li>
);

export const IssuesPage = ({ data }: { readonly data: PortalData }) => {
  const { monitor } = data;
  return (
    <Page status={200} data={data} scope="all">
      <h1>Issues</h1>
      {monitor === null ? <Why hole="issues" /> : (
        <>
          <p className="meta">{`One issue is one (operation, step, error tag). A refusal opens none. Kept past the window, as of ${iso(monitor.now)}.`}</p>
          {monitor.issues.length === 0 ? <p>No issue.</p> : <ul className="issues">{monitor.issues.map((i) => <IssueLine key={i.key} issue={i} />)}</ul>}
        </>
      )}
    </Page>
  );
};

export const MonitorPage = ({ data }: { readonly data: PortalData }) => (
  <Page status={200} data={data} scope="all">
    <h1>Monitor</h1>
    <p><a href="/portal/monitor/alerts">Alerts</a>: what the model says to watch, and whether it is burning.</p>
    <p><a href="/portal/monitor/issues">Issues</a>: the defects the window held, grouped by operation, step and error tag.</p>
  </Page>
);
