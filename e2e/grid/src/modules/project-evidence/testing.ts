// Captured evidence for the row evals' tests: a project's `generated/` files, the portal's pages and, for Plugged In, the CLI help, MCP tools,
// spans and prove report of one real run, copied into `e2e/grid/fixtures/<project>/` by `main.ts capture`. The tests judge these copies and
// never the live outputs: a builder who changes a generator to turn a cell green must not break a test, so every red a test asserts is a defect
// planted in today's captured output. Recapture with `capture --out e2e/grid/fixtures/plugged-in --run` (acme: no `--run`) to move the copies on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Eval, Finding } from "../grid/types.ts";
import type { ProjectEvidence, ProjectModel } from "./types.ts";

const fixtures = join(import.meta.dirname, "../../../fixtures");

const json = <A>(path: string): A => JSON.parse(readFileSync(path, "utf8")) as A;

/**
 * The captured evidence of a project. Acme has no captured run, so it has no CLI, MCP, spans or prove report. `plugged-in-rules` is Plugged In as ST1.19 leaves it (a throwaway stand-in
 * of the slice, captured on 21 November 2026): the evals of the invariant row judge it, because today's Plugged In declares no rule.
 */
export const evidenceOf = (name: "plugged-in" | "plugged-in-rules" | "acme"): Promise<ProjectEvidence> => {
  const dir = join(fixtures, name);
  const files = json<Readonly<Record<string, string>>>(join(dir, "files.json"));
  const run = name !== "acme" ? json<Pick<ProjectEvidence, "cli" | "mcp" | "spans" | "prove">>(join(dir, "run.json")) : { cli: {}, mcp: undefined, spans: undefined, prove: undefined };
  return Promise.resolve({ model: JSON.parse(files["generated/model/model.json"]!) as ProjectModel, files, portal: json<ProjectEvidence["portal"]>(join(dir, "portal.json")), ...run });
};

/** One eval's finding for one subject: a missing eval is a red finding that names it, never a throw. */
export const judge = (evals: ReadonlyArray<Eval<ProjectEvidence>>, cell: string, subject: string, evidence: ProjectEvidence): Finding => {
  const found = evals.find((x) => x.cell === cell);
  return found === undefined ? { ok: false, why: [`no eval for ${cell}`] } : found.judge(subject, evidence);
};

/** The evidence with one generated file changed. */
export const editFile = (e: ProjectEvidence, path: string, change: (text: string) => string): ProjectEvidence => ({ ...e, files: { ...e.files, [path]: change(e.files[path] ?? "") } });
/** The evidence with one portal page changed. */
export const editPortal = (e: ProjectEvidence, route: string, change: (html: string) => string): ProjectEvidence => ({ ...e, portal: { ...e.portal, [route]: change(e.portal[route] ?? "") } });
/** The evidence with the spans changed. */
export const editSpans = (e: ProjectEvidence, change: (spans: NonNullable<ProjectEvidence["spans"]>) => NonNullable<ProjectEvidence["spans"]>): ProjectEvidence => ({ ...e, spans: change(e.spans ?? []) });
/** The evidence with a prove line taken away, as if prove had not printed it with a tick. */
export const withoutProveLine = (e: ProjectEvidence, line: string): ProjectEvidence => ({ ...e, prove: { journeys: e.prove?.journeys ?? [], lines: (e.prove?.lines ?? []).filter((l) => !l.startsWith(line)) } });
