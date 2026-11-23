// What the pages share: the page's own hooks, a table, a proof cell and its note, the banner for a ledger that could not be read.
// Plain elements on purpose: the grid's evals read the rendered DOM as a person's page, by its headings, rows and list items.
import type { ReactNode } from "react";
import type { PortalProof, PortalSnapshot } from "#modules/snapshot/types.js";
import type { FieldWire, OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Chrome } from "./chrome.tsx";
import type { RuleRef } from "./rules.ts";
import { withRefusals } from "./rules.tsx";

/** The page's one root: `data-ready` says it has drawn from the data API, `data-status` is its own verdict (404 for a route that is not a page). */
export const Page = ({ status, ready = true, data, scope = "all", operations, children }: {
  readonly status: number; readonly ready?: boolean; readonly children?: ReactNode;
  /** The data the frame is drawn from; a page with none (loading, a failure, not found) has no frame. */
  readonly data?: PortalData; readonly scope?: string; readonly operations?: ReadonlyArray<string>;
}) => (
  <main data-portal="page" data-ready={ready ? "true" : "false"} data-status={String(status)}>
    {data === undefined ? children : <Chrome data={data} scope={scope} {...(operations === undefined ? {} : { operations })}>{children}</Chrome>}
  </main>
);

export const Table = ({ head, rows }: { readonly head: ReadonlyArray<string>; readonly rows: ReadonlyArray<ReadonlyArray<ReactNode>> }) => (
  <table>
    <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((cells, i) => <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
);

const WORDS: Record<PortalProof["state"], readonly [string, (environment: string) => string]> = {
  "recorded-pass": ["pass", (e) => `${e} ✔`],
  failed: ["fail", (e) => `${e} ✘ failed`],
  stale: ["old", (e) => `${e} stale`],
  unproven: ["none", (e) => `${e} unproven`],
  unavailable: ["na", (e) => `${e} unavailable`],
};

/** One environment's cell. Only a recorded pass carries a tick; its words are the state's, so a failure, a change and a gap read as what they are. */
export const Cell = ({ proof }: { readonly proof: PortalProof }) => {
  const [style, text] = WORDS[proof.state];
  return <span className={style}>{text(proof.environment)}</span>;
};

/** What a cell says beyond its word: the declarations that changed, or that the pass is the contract's and not the candidate's. */
export const noteOf = (p: PortalProof, candidate: string | null): string => {
  if (p.state === "stale") return `${p.environment}: ${p.changedDependencies.map((c) => `${c.key} changed (was ${c.was}, now ${c.now ?? "gone"})`).join("; ")}`;
  if (p.state === "recorded-pass" && p.candidateNotRerun && p.evidence.state === "available") {
    return `${p.environment}: contract unchanged; candidate ${candidate ?? "?"} not rerun (evidence ${p.evidence.value.revision})`;
  }
  if (p.state === "unavailable" || p.state === "failed") return `${p.environment}: ${p.reason ?? ""}`;
  return "";
};

export const Banner = ({ snapshot }: { readonly snapshot: PortalSnapshot }) => {
  const failed = snapshot.proofs.find((p) => p.state === "unavailable");
  return snapshot.consistency === "unavailable" && failed !== undefined
    ? <p className="banner">{`The logbook could not be read: ${failed.reason ?? ""}. Nothing below is a proof.`}</p>
    : null;
};

const detailOf = (f: FieldWire) => Object.entries(f.value).filter(([k]) => k !== "type").map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(", ");

/** A Description column appears only when a field has one (M1.42), so a thing that declares none looks as it did. */
export const FieldRows = ({ fields }: { readonly fields: Readonly<Record<string, FieldWire>> }) => {
  const described = Object.values(fields).some((f) => f.description !== undefined);
  return (
    <Table
      head={["Field", "Type", "Detail", ...(described ? ["Description"] : [])]}
      rows={Object.entries(fields).map(([name, f]) => [`${name}${f.optional ? " (optional)" : ""}`, f.ref ?? f.named ?? String(f.value["type"] ?? "?"), detailOf(f), ...(described ? [f.description ?? ""] : [])])}
    />
  );
};

/** Who may call an operation, in words. */
export const who = (op: OperationWire): string =>
  op.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}${a.path ? ` of its ${a.path}` : ""}`.trim())).join(", or ");

/** The generated doc of a page, as text, under a Docs heading: the last thing on the page, and not the portal's own part of it. A refusal a rule owns reads as the rule's, here as everywhere. */
export const Docs = ({ text, owners }: { readonly text: string | undefined; readonly owners: ReadonlyMap<string, RuleRef> }) => (text === undefined ? null : <><h2>Docs</h2><pre>{withRefusals(text, owners)}</pre></>);
