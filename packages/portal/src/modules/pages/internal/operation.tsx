// /portal/operations/<name>: five tabs, one server-drawn panel at a time. Contract is the default and holds what an operation is (its payload,
// answer, refusals counted by code, steps, and the journeys that call it); Metrics, Proof, Docs and Notes are in `op-tabs.tsx`.
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { journeysCalling, refusalsFor } from "./model.ts";
import { refusalCount, whyNot } from "./live.ts";
import { ruleBehind } from "./rules.ts";
import { Refusal } from "./rules.tsx";
import { Spine } from "./spine.tsx";
import { NotYet } from "./not-yet.tsx";
import { Banner, FieldRows, Page, who } from "./parts.tsx";
import { DocsTab, MetricsTab, NotesTab, ProofTab } from "./op-tabs.tsx";
import { TABS } from "./route.ts";

const Contract = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const { blueprint } = data;
  const steps = Object.values(op.steps);
  const journeys = journeysCalling(blueprint, op.name);
  const why = whyNot(data, "metrics");
  return (
    <>
      <h2>Contract</h2>
      <p>{`${op.kind === "read" ? "A read: answered from the records, with no handler." : "An operation."} Who may call: ${who(op)}.${op.idempotent ? " Idempotent by request." : ""}${op.budget ? ` Budget: p95 ${op.budget.p95Ms}ms.` : ""}`}</p>
      <h3>Payload</h3>
      <FieldRows fields={op.payload} />
      <h3>Answer</h3>
      <FieldRows fields={op.answer} />
      {op.move ? <p>{`Move ${op.move.key}: from ${op.move.from.join(" or ") || "nothing (it creates)"} to ${op.move.to.join(" or ")}, emitting ${op.move.emits}.`}</p> : null}
      <h3>Refusals</h3>
      {why === undefined ? null : <p>Refusal counts: <NotYet hole="metrics" what={why} /></p>}
      {/* One short list per refusal: a rule's refusal is an element that holds its name as a list item, then the rule's sentence and its link. */}
      <div className="refusals">
        {refusalsFor(blueprint, op).map(([name, code]) => {
          const count = refusalCount(data, name, op.name);
          return (
            <Refusal key={name} name={name} owner={ruleBehind(blueprint, op, name)} code={code} count={count}>
              <ul>
                <li><span data-portal="refusal-code" data-refusal={name} data-code={code} {...(count === null ? {} : { "data-count": String(count) })}>{name}</span></li>
              </ul>
            </Refusal>
          );
        })}
      </div>
      <Spine blueprint={blueprint} op={op} />
      {steps.length > 0 ? <><h3>Steps</h3><ul>{steps.map((st) => <li key={st.name}>{`${st.name} (${st.type})`}</li>)}</ul></> : null}
      <h3>Journeys that call it</h3>
      {journeys.length === 0
        ? <p>No declared journey calls this operation.</p>
        : <ul>{journeys.map((j) => <li key={j.name}>{j.name}</li>)}</ul>}
      <p><a href={`/portal/things/${encodeURIComponent(op.thing)}`}>{op.thing}</a></p>
    </>
  );
};

const LABELS: Readonly<Record<string, string>> = { contract: "Contract", metrics: "Metrics", proof: "Proof", docs: "Docs", notes: "Notes" };

export const OperationPage = ({ data, op, tab }: { readonly data: PortalData; readonly op: OperationWire; readonly tab: string }) => (
  <Page status={200} data={data} scope={`thing:${op.thing}`} operations={[op.name]}>
    <h1>{op.name}</h1>
    <p>{op.description}</p>
    <Banner snapshot={data.snapshot} />
    <nav data-portal="op-tabs" aria-label="Operation">
      {TABS.map((t) => <a key={t} data-portal="op-tab" data-tab={t} aria-current={t === tab ? "page" : undefined} href={`/portal/operations/${encodeURIComponent(op.name)}${t === "contract" ? "" : `?tab=${t}`}`}>{LABELS[t]}</a>)}
    </nav>
    <div data-portal="op-panel" data-tab={tab}>
      {tab === "metrics" ? <MetricsTab data={data} op={op} /> : tab === "proof" ? <ProofTab data={data} op={op} /> : tab === "docs" ? <DocsTab data={data} op={op} /> : tab === "notes" ? <NotesTab op={op} /> : <Contract data={data} op={op} />}
    </div>
  </Page>
);
