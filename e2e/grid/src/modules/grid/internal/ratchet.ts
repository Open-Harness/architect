import { BLOCKS, OUTPUTS, type ExpectedRed, type Parsed, type RatchetResult, type Report } from "../types.ts";

const key = (cell: string, subject: string) => `${cell}:${subject}`;
const isCell = (id: unknown): boolean => {
  if (typeof id !== "string") return false;
  const [block, output, ...rest] = id.split(".");
  return rest.length === 0 && (BLOCKS as ReadonlyArray<string>).includes(block ?? "") && (OUTPUTS as ReadonlyArray<string>).includes(output ?? "");
};

export const parseExpected = (json: unknown): Parsed<ReadonlyArray<ExpectedRed>> => {
  const pairs = typeof json === "object" && json !== null ? (json as { readonly pairs?: unknown }).pairs : undefined;
  if (!Array.isArray(pairs)) return { ok: false, problems: ['the expected-red list needs a "pairs" array'] };
  const seen = new Set<string>();
  const problems = pairs.flatMap((p: unknown, at) => {
    const v = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    const text = (name: string) => (typeof v[name] === "string" && v[name] !== "" ? [] : [`pairs[${at}].${name} must say something`]);
    const twice = typeof v["cell"] === "string" && typeof v["subject"] === "string" && seen.has(key(v["cell"], v["subject"])) ? [`${key(String(v["cell"]), String(v["subject"]))} is listed twice`] : [];
    if (typeof v["cell"] === "string" && typeof v["subject"] === "string") seen.add(key(v["cell"], v["subject"]));
    return [...(isCell(v["cell"]) ? [] : [`pairs[${at}].cell ${JSON.stringify(v["cell"])} is not a cell of the grid`]), ...text("subject"), ...text("reason"), ...text("waitsOn"), ...twice];
  });
  return problems.length > 0 ? { ok: false, problems } : { ok: true, value: pairs as ReadonlyArray<ExpectedRed> };
};

export const ratchet = (report: Report, expected: ReadonlyArray<ExpectedRed>): RatchetResult => {
  const listed = new Set(expected.map((e) => key(e.cell, e.subject)));
  const judged = new Map(report.verdicts.map((v) => [key(v.cell, v.subject), v.verdict] as const));
  const unexpected = report.verdicts.filter((v) => v.verdict === "fail" && !listed.has(key(v.cell, v.subject))).map((v) => key(v.cell, v.subject));
  const unjudged = [...listed].filter((k) => !judged.has(k));
  const fixed = [...listed].filter((k) => judged.get(k) === "pass");
  return { unexpected, unjudged, fixed, expectedRed: expected.length - unjudged.length - fixed.length, ok: unexpected.length + unjudged.length + fixed.length === 0 };
};

export const ratchetLines = (r: RatchetResult): ReadonlyArray<string> => [
  ...r.unexpected.map((k) => `✘ red and not on e2e/grid/expected-red.json: ${k}`),
  ...r.unjudged.map((k) => `✘ on expected-red.json but not switched on: ${k}`),
  ...r.fixed.map((k) => `✘ now green, take it off expected-red.json: ${k}`),
  `ratchet ${r.ok ? "✔" : "✘"} ${r.expectedRed} expected red, ${r.unexpected.length} unexpected, ${r.fixed.length} newly green, ${r.unjudged.length} not switched on`,
];
