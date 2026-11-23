import type { Eval } from "../../grid/types.ts";
import type { RefusalEvidence } from "../types.ts";
import { factsOf, lineProblems } from "./facts.ts";

const lineOf = (text: string, name: string) => text.split("\n").find((line) => line.includes(`] ${name}`) || line.startsWith(name));

/** error.cli: the CLI prints `[code] Name { … }` to stderr and exits with the refusal's exit code. */
export const cli: Eval<RefusalEvidence> = {
  cell: "error.cli",
  judge: (subject, evidence) => {
    const outcome = evidence.cli;
    if (outcome === undefined) return { ok: false, why: [`no refused ${subject} call was seen through the CLI (the journey must run through it: prove --through cli, M2.08)`] };
    const facts = factsOf(evidence.model, subject, evidence.held);
    const line = lineOf(outcome.stderr, subject);
    const problems = [
      ...(line === undefined ? [`expected a line "[${facts.code ?? "code"}] ${subject} { … }" on stderr, got "${outcome.stderr.trim()}"`] : lineProblems(facts, line).map((p) => `the CLI's line ${p}`)),
      ...(facts.exit === undefined ? (outcome.status === 0 || outcome.status === null ? [`expected a non-zero exit, got ${String(outcome.status)}`] : []) : outcome.status === facts.exit ? [] : [`expected exit ${facts.exit}, got ${String(outcome.status)}`]),
    ];
    return { ok: problems.length === 0, why: problems };
  },
};

/** error.mcp: the tool result is an error whose text carries the refusal's code, with fields cut to what the agent may see. */
export const mcp: Eval<RefusalEvidence> = {
  cell: "error.mcp",
  judge: (subject, evidence) => {
    const result = evidence.mcp;
    if (result === undefined) return { ok: false, why: [`no refused ${subject} call was seen through MCP (the journey must run through it: prove --through mcp, M2.08)`] };
    const facts = factsOf(evidence.model, subject, evidence.held);
    const text = result.text ?? (result.content ?? []).map((part) => part.text ?? "").join("\n");
    const line = lineOf(text, subject);
    const problems = [
      ...(result.isError === true ? [] : [`expected an error result (isError: true), got ${String(result.isError)}`]),
      ...(line === undefined ? [`expected a line "[${facts.code ?? "code"}] ${subject} { … }" in the result, got "${text.trim()}"`] : lineProblems(facts, line).map((p) => `the MCP result ${p}`)),
    ];
    return { ok: problems.length === 0, why: problems };
  },
};
