// The operation page's other four tabs. Each is one panel; none of them is a list of spans (a trace has its own page).
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Calls } from "./calls.tsx";
import { environmentsOf, journeysCalling } from "./model.ts";
import { NotYet } from "./not-yet.tsx";
import { refusalOwners } from "./rules.ts";
import { Cell, Docs, Table, noteOf } from "./parts.tsx";

export const MetricsTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <>
    <h2>Metrics</h2>
    <Calls data={data} op={op} />
  </>
);

export const ProofTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const { blueprint, snapshot: s } = data;
  const declared = environmentsOf(blueprint).map((e) => e.name);
  const mine = declared.map((e) => ({ environment: e, proof: s.proofs.find((p) => p.operation === op.name && p.environment === e) }));
  const proof = mine.map(({ environment, proof: p }) => p === undefined
    ? [<span data-portal="proof-cell" data-environment={environment} data-state="unavailable">{`${environment} unavailable`}</span>, "No verdict is recorded for this environment.", ""]
    : [
      <span data-portal="proof-cell" data-environment={environment} data-state={p.state}><Cell proof={p} /></span>,
      p.evidence.state === "available"
        ? `revision ${p.evidence.value.revision}, ${p.evidence.value.verdict}, ${p.evidence.value.ref}, ${p.evidence.value.repository}, seq ${p.evidence.value.seq}, execution ${p.execution}`
        : p.evidence.reason,
      noteOf(p, s.candidate.revision),
    ]);
  const journeys = journeysCalling(blueprint, op.name);
  const depends = Object.entries(blueprint.dependsOnByOperation[op.name] ?? {});
  return (
    <>
      <h2>Proof</h2>
      <Table head={["Environment", "Evidence", "Notes"]} rows={proof} />
      <p className="meta">{`A tick means: contract unchanged; candidate not rerun. It is the recorded verdict of the evidence revision, not a fresh run of the candidate ${s.candidate.revision ?? ""}. Whether a journey ran in that environment is not recorded.`}</p>
      <h3>Each eval</h3>
      {mine.map(({ environment }) => <p key={environment} data-portal="eval-verdicts" data-environment={environment} data-state="not yet">{`${environment}: `}<NotYet hole="per-eval" what="the logbook stores one aggregate verdict, not one per eval" /></p>)}
      <h3>Journeys that prove it</h3>
      {journeys.length === 0 ? <p>No declared journey calls this operation.</p> : <ul>{journeys.map((j) => <li key={j.name}>{j.name}</li>)}</ul>}
      <h3>Its proof rests on</h3>
      <Table head={["Declaration", "Hash"]} rows={depends} />
    </>
  );
};

export const DocsTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <Docs text={data.blueprint.docs[`${op.thing}/${op.verb}.md`]} owners={refusalOwners(data.blueprint)} />
);

export const NotesTab = ({ op }: { readonly op: OperationWire }) => (
  <>
    <h2>Notes</h2>
    <p>{`Notes on ${op.name} are not drawn yet: `}<NotYet hole="notes" what="the wire carries no notes" /></p>
  </>
);
