// The snag log's reader (check 03), a pure function over the log's text and the branch's history, so the controls can plant wrong inputs.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repo } from "../layer1/support.ts";

export const snagLog = join(repo, "design/goals/04-snags.md");
export const readSnagLog = () => existsSync(snagLog) ? readFileSync(snagLog, "utf8") : "";

/** The snags the journey author and the checks author logged: S-01 to S-11 stay in the log, and an entry deleted is not a fixed one. */
export const FIRST_SNAGS = 11;

/** What `git log HEAD` says: the pull requests merged (`Merge pull request #n`), the commits, and whether the clone is too shallow to know. */
export interface History { readonly prs: ReadonlySet<number>; readonly commits: ReadonlyArray<string>; readonly shallow: boolean }
export const gitHistory = (): History => {
  const git = (...args: string[]) => spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stdout;
  const lines = git("log", "HEAD", "--format=%H %s").split("\n").filter((l) => l !== "");
  return {
    prs: new Set(lines.flatMap((l) => { const m = l.match(/^[0-9a-f]{40} Merge pull request #(\d+) /); return m ? [Number(m[1])] : []; })),
    commits: lines.map((l) => l.slice(0, 40)),
    shallow: git("rev-parse", "--is-shallow-repository").trim() === "true",
  };
};

/** The owners that exist: roles and threads of the repository (AGENTS.md, "Who decides"; the goal's five roles), not a placeholder. */
const OWNER = /^(?:the lead|(?:the )?Goal \d+ lead|the journey author|(?:the|a) checks author|(?:the|a) framework builder|the reviewer|the user|Aaron)(?: \([^()]*\))?$/;
const FIXED = /^fixed \((?:#(\d+)|([0-9a-f]{7,40}))(?:[ ,:;][^()]*)?\)\.?$/;
const PARKED = /^parked \([^()]+\):\s*(.*?)\s*\bOwner:\s*(.*)$/;
const FIELDS = ["Hit", "Lost", "Cause", "Fix", "Status"] as const;
const words = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const distinctWords = (text: string) => new Set((text.toLowerCase().match(/\p{L}{3,}/gu) ?? [])).size;

const statusProblems = (label: string, text: string, history: History): ReadonlyArray<string> => {
  const word = text.match(/^[A-Za-z-]+/)?.[0] ?? "";
  if (word === "open" || word === "building") return [`${label} is ${word}`];
  const fixed = text.match(FIXED);
  if (fixed) {
    if (fixed[1] !== undefined) return history.prs.has(Number(fixed[1])) ? [] : [`${label} is fixed by #${fixed[1]}, which is not a pull request merged into this branch (no \`Merge pull request #${fixed[1]}\` in git log HEAD)`];
    return history.commits.some((c) => c.startsWith(fixed[2]!)) ? [] : [`${label} is fixed by ${fixed[2]}, which is not a commit in git log HEAD`];
  }
  const parked = text.match(PARKED);
  if (parked) {
    const owner = parked[2]!.match(/^(.*?)(?:\.(?:\s|$)|$)/)![1]!.trim();
    return [
      ...(OWNER.test(owner) ? [] : [`${label} is parked with owner ${JSON.stringify(owner)}: not a role or thread that exists (the lead, a goal lead, the journey author, a checks author, a framework builder, the reviewer, the user, Aaron)`]),
      ...(distinctWords(parked[1]!) >= 4 ? [] : [`${label} is parked without a reason (four distinct words of three letters or more, before \`Owner:\`)`]),
    ];
  }
  return [`${label} has Status \`${text.slice(0, 50)}\`: not \`fixed (#n …)\`, \`fixed (<commit> …)\` or \`parked (who): reason. Owner: <role>\``];
};

/**
 * What is wrong with the snag log, one line per problem naming its snag. Every `S-nn` heading is `## S-nn · title`, outside any quote or fence,
 * and the headings equal the `- Status:` lines in count; numbers run from S-01 with no gap or repeat, to at least S-11; each entry keeps its
 * Hit, Lost, Cause, Fix and Status lines once, each with at least three words; and each Status is `fixed` (a pull request merged into this
 * branch, or a commit in its history), or `parked` (a reason and an owner who exists). `open` and `building` are named.
 */
export const snagProblems = (log: string, history: History): ReadonlyArray<string> => {
  const lines = log.split("\n");
  const problems: string[] = [];
  let fenced = false;
  const entries: Array<{ id: string; title: string; body: string[] }> = [];
  let headings = 0, statuses = 0;
  for (const line of lines) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    const quoted = /^\s*>/.test(line);
    const mention = line.match(/^[\s>]*#{1,6}\s*(S-\d+)/);
    const status = /^[\s>]*[-*]\s*Status\s*:/.test(line);
    if (mention) headings++;
    if (status) statuses++;
    const strict = !fenced && !quoted ? line.match(/^## (S-\d\d) · (\S.*)$/) : null;
    if (strict) { entries.push({ id: strict[1]!, title: strict[2]!, body: [] }); continue; }
    if (mention) { problems.push(`${mention[1]} is a heading ${fenced ? "inside a code fence" : quoted ? "inside a quote" : "that is not `## S-nn · title`"}`); continue; }
    if (status && (fenced || quoted)) problems.push(`a Status line inside a ${fenced ? "code fence" : "quote"}: ${line.trim().slice(0, 60)}`);
    if (!fenced && !quoted) entries.at(-1)?.body.push(line);
  }
  if (headings !== statuses) problems.push(`${headings} snag heading(s) but ${statuses} \`- Status:\` line(s) in the file`);
  const ids = entries.map((e) => e.id);
  for (let n = 1; n <= Math.max(FIRST_SNAGS, ...ids.map((id) => Number(id.slice(2)))); n++) {
    const id = `S-${String(n).padStart(2, "0")}`;
    if (!ids.includes(id)) problems.push(`${id} is missing from the log (an entry is never deleted)`);
  }
  for (const id of ids.filter((id, i) => ids.indexOf(id) !== i)) problems.push(`${id} appears twice`);
  for (const e of entries) {
    const label = `${e.id} (${e.title})`;
    for (const field of FIELDS) {
      const found = e.body.filter((l) => l.startsWith(`- ${field}:`));
      if (found.length !== 1) { problems.push(`${label} has ${found.length} \`- ${field}:\` lines, not one`); continue; }
      const text = found[0]!.slice(`- ${field}:`.length).trim();
      if (field === "Status") problems.push(...statusProblems(label, text, history));
      else if (words(text) < 3) problems.push(`${label} has an empty \`- ${field}:\` line`);
    }
  }
  return problems;
};
