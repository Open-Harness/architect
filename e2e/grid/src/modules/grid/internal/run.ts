import type { CellId, Eval, Report, SwitchedOn, Verdict } from "../types.ts";

/** One (cell, subject): the eval's finding, or red because nothing proves the cell. */
const judged = <E>(entry: SwitchedOn, subject: string, evals: ReadonlyArray<Eval<E>>, evidence: (cell: CellId, subject: string) => E): Verdict => {
  const found = evals.find((e) => e.cell === entry.cell);
  if (found === undefined) return { cell: entry.cell, subject, verdict: "fail", switchedBy: entry.switchedBy, why: [`${entry.cell} is switched on and has no eval: a cell with nothing to prove it is red`] };
  const finding = found.judge(subject, evidence(entry.cell, subject));
  return { cell: entry.cell, subject, verdict: finding.ok ? "pass" : "fail", switchedBy: entry.switchedBy, why: finding.why };
};

export const run = <E>(options: {
  readonly list: { readonly cells: ReadonlyArray<SwitchedOn> };
  readonly evals: ReadonlyArray<Eval<E>>;
  readonly evidence: (cell: CellId, subject: string) => E;
  readonly revision: string;
  readonly environment: string;
}): Report => {
  const verdicts = options.list.cells.flatMap((entry) => entry.subjects.map((subject) => judged(entry, subject, options.evals, options.evidence)));
  return { revision: options.revision, environment: options.environment, verdicts, passed: verdicts.every((v) => v.verdict === "pass") };
};

export const lines = (report: Report): ReadonlyArray<string> => {
  const red = report.verdicts.filter((v) => v.verdict === "fail");
  return [
    ...report.verdicts.map((v) => `${v.verdict === "pass" ? "✔" : "✘"} ${v.cell} ${v.subject}`),
    ...red.flatMap((v) => [`${v.cell} ${v.subject} (switched on by "${v.switchedBy}")`, ...v.why.map((line) => `  ${line}`)]),
    `grid ${report.passed ? "✔" : "✘"} ${report.verdicts.length - red.length} of ${report.verdicts.length} switched-on cells green`,
  ];
};

export const combine = (reports: ReadonlyArray<Report>, revision: string, environment: string): Report => {
  const verdicts = reports.flatMap((r) => r.verdicts);
  return { revision, environment, verdicts, passed: verdicts.every((v) => v.verdict === "pass") };
};
