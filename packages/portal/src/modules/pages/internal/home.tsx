// /portal: the things as cards in the tree's order, each with its lifecycle; the matrix of every operation in every environment with what
// the window counted of it; what is stale and why.
import { Card } from "@orthograph/portal-ui";
import type { ThingWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Lifecycle } from "./lifecycle.tsx";
import { tallyOf } from "./live.ts";
import { Banner, Cell, Page, Table, noteOf } from "./parts.tsx";
import { WorstFirst } from "./worst-first.tsx";

const ThingCard = ({ data, thing }: { readonly data: PortalData; readonly thing: ThingWire }) => {
  const ops = Object.values(data.blueprint.model.operations).filter((o) => o.thing === thing.name).map((o) => o.name);
  const t = tallyOf(data, ops);
  return (
    <li>
      <Card data-portal="thing-card" data-thing={thing.name} data-calls={t.calls} data-refused={t.refused} data-defects={t.defects}>
        <Card.Content>
          <Card.Title><a href={`/portal/things/${encodeURIComponent(thing.name)}`}>{thing.name}</a></Card.Title>
          <Card.Description>{thing.description}</Card.Description>
        </Card.Content>
      </Card>
      {thing.machine === null ? null : <Lifecycle data={data} thing={thing} counted={false} />}
    </li>
  );
};

export const Home = ({ data }: { readonly data: PortalData }) => {
  const { blueprint, snapshot: s } = data;
  const rows = s.operations.map((operation) => {
    const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === operation && p.environment === e)!);
    const known = operation in blueprint.model.operations;
    const t = tallyOf(data, operation);
    return [
      known ? <a href={`/portal/operations/${encodeURIComponent(operation)}`}>{operation}</a> : operation,
      ...mine.map((p) => <Cell key={p.environment} proof={p} />),
      t.calls, t.refused, t.defects,
      blueprint.model.operations[operation]?.budget ? `budget ${blueprint.model.operations[operation]!.budget!.p95Ms} ms, observed not yet` : "no budget",
      <span className="note">{mine.map((p) => noteOf(p, s.candidate.revision)).filter((n) => n !== "").join(" / ")}</span>,
    ];
  });
  const release = s.release.state === "available" && s.release.value !== null ? `Released ${s.release.value.version} at ${s.release.value.revision}.` : "";
  return (
    <Page status={200} data={data} scope="all">
      <h1>{blueprint.project}</h1>
      <p className="meta">{`Bundle ${s.bundleRevision ?? "unknown"}. Judged against ${s.candidate.revision ?? "unknown"} (${s.candidate.source === "logbook" ? "newest revision proved in test" : "this bundle's own model"}). ${release} Ledger read: ${s.consistency}.`}</p>
      <Banner snapshot={s} />
      <WorstFirst data={data} />
      <h2>Operations</h2>
      <Table head={["Operation", ...s.environments, "Calls", "Refused", "Defects", "p95", "Notes"]} rows={rows} />
      <h2>Things</h2>
      <ul className="things">{Object.values(blueprint.model.things).map((t) => <ThingCard key={t.name} data={data} thing={t} />)}</ul>
      <p className="meta">A tick is a recorded pass from main whose contract is as it is now, not a fresh run. Stale: it passed an older contract. Unproven: no verdict. Unavailable: the portal could not tell. Calls, Refused and Defects are counted over the window; `not yet` is a number the portal has no source for.</p>
    </Page>
  );
};
