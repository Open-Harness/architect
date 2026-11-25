// What GitHub should hold, worked out from the goal briefs (K33), and the steps that get it there from what it holds.
// Pure: no I/O. `sync.mjs` reads the briefs and GitHub, calls `plan`, and applies the steps.
import { BOARD_KINDS } from "./board.mjs";

export const LABELS = [
  ["kind:goal", "5319e7", "A goal: one lead, one branch, one done check, one milestone (K32, K33)"],
  ["kind:slice", "1d76db", "One slice of a goal: a sub-issue of its goal, closed by the pull request that lands it"],
  ["kind:snag", "d73a4a", "Something a goal hit and could not fix in its own paths"],
  ["kind:ask", "fbca04", "One goal asking another to act; in the milestone of the goal that must act"],
  ["kind:gap", "c5def5", "A hole in the capability map (a row whose id starts gap-), or a ledger row picked up as work"],
  ["kind:capability", "0052cc", "A row of the capability map in docs/canon/status.md: one item, written by the board sync (K42)"],
  ["kind:decision", "0e8a16", "A call to be made; closed by the pull request that records it in design/decisions/"],
  ["release:preview", "bfd4f2", "Ships in the preview (K28)"],
  ["release:beta", "bfd4f2", "Ships in the beta: the framework Capxul's books, HR and payroll prove (K44)"],
  ["release:1.0", "bfd4f2", "Ships in 1.0 (K28)"],
  ["role:lead", "ededed", "Opened by a goal's lead"],
  ["role:author", "ededed", "Journeys and checks, written first (the author skill)"],
  ["role:builder", "ededed", "Builds a slice against checks it did not write"],
  ["role:reviewer", "ededed", "A 🔍 verdict"],
  ["role:designer", "ededed", "A decision worked through with Aaron"],
  ["role:spike", "ededed", "Throwaway code that answers one question"],
  ["harness:claude", "f9d0c4", "Worked in Claude Code"],
  ["harness:amp", "f9d0c4", "Worked in Amp"],
  ["harness:codex", "f9d0c4", "Worked in Codex"],
  ["harness:opencode", "f9d0c4", "Worked in OpenCode"],
  ["blocked", "b60205", "Waiting on something outside its goal; the body says what"],
  ["needs-aaron", "e99695", "Only Aaron can unblock it: money, a credential, production, or the goal itself"],
  ["parked", "d4c5f9", "Its goal is parked: left out of the board's views, never closed, and taken off if the goal resumes (K45)"],
].map(([name, color, description]) => ({ name, color, description }));

// A kind is its own issue type in an organization (Aaron, 2A); a person's repository has only the native three, so
// there the nearest native type stands in and the kind label says the rest.
export const ISSUE_TYPES = [
  ["Goal", "PURPLE", "A goal: one lead, one branch, one done check, one milestone"],
  ["Slice", "BLUE", "One step of a goal, a sub-issue of its goal issue"],
  ["Snag", "RED", "Something a goal hit and could not fix in its own paths"],
  ["Ask", "YELLOW", "One goal asking another to act"],
  ["Decision", "GREEN", "A call waiting to be made"],
  ["Gap", "GRAY", "A ledger row picked up as work"],
  ["Capability", "BLUE", "A row of the capability map: one item of the board"],
].map(([name, color, description]) => ({ name, color, description }));
const NATIVE = { goal: "Feature", slice: "Task", snag: "Bug", ask: "Task", decision: "Task", gap: "Task", capability: "Task" };
const own = (state) => state.ownerType === "Organization";
export const typeOf = (kind, state) => (own(state) ? ISSUE_TYPES.find((x) => x.name.toLowerCase() === kind).name : NATIVE[kind]);

const RELEASE = { preview: "release:preview", beta: "release:beta", "1.0": "release:1.0" };
const RELEASE_OF_MILESTONE = { Preview: "release:preview", Beta: "release:beta", "1.0": "release:1.0" };

export const goalMarker = (n) => `<!-- orthograph:goal=${n} -->`;
export const sliceMarker = (n, s) => `<!-- orthograph:slice=${n}.${s} -->`;

const line = (label, value) => (value ? `**${label}:** ${value}` : null);
const isOpen = (i) => (i.state ?? "open") === "open";

/** The goal's slice issues, snags and what waits on other goals, as GitHub holds them now: the goal page's live part. */
export const goalView = (g, state) => {
  const real = state.issues.filter((i) => !i.pullRequest && i.trusted !== false);
  const sliceIssue = (n) =>
    real.filter((i) => i.labels.includes("kind:slice") && (i.body ?? "").includes(sliceMarker(g.number, n))).sort((x, y) => x.number - y.number)[0];
  const slices = g.slices.filter((s) => s.number !== null).map((s) => ({ ...s, issue: sliceIssue(s.number) ?? null }));
  const blocks = (n) => slices.filter((s) => (s.issue?.blockedBy ?? []).includes(n)).map((s) => s.number);
  const snags = real.filter((i) => isOpen(i) && i.labels.includes("kind:snag") && i.milestone === g.milestone);
  const waiting = real.filter((i) => isOpen(i) && i.milestone !== g.milestone && blocks(i.number).length > 0);
  const done = (s) => s.issue !== null && !isOpen(s.issue);
  const blockedOpen = (s) => (s.issue?.blockedBy ?? []).some((n) => real.some((i) => i.number === n && isOpen(i)));
  const ready = slices.filter((s) => !done(s) && !blockedOpen(s) && s.after.every((a) => slices.some((x) => x.number === a && done(x))));
  return {
    done: slices.filter(done).length,
    total: slices.length,
    ready,
    snags: snags.map((i) => ({ number: i.number, title: i.title, blocks: blocks(i.number) })),
    waiting: waiting.map((i) => ({ number: i.number, title: i.title, milestone: i.milestone, blocks: blocks(i.number) })),
  };
};

// GitHub breaks an issue body's lines where the source wraps them, so a brief's wrapped prose is joined back into
// whole lines: a continuation (an indented line, or prose after prose) joins the line before it.
export const unwrap = (text) => {
  const out = [];
  let fence = false;
  for (const line of text.split("\n")) {
    const opens = line.trimStart().startsWith("```");
    const prev = out.length ? out[out.length - 1] : "";
    const joins = !fence && !opens && line.trim() !== "" && prev.trim() !== "" && !/^\s*(\||#|```)/.test(prev) &&
      !/^\s*([-*+] |\d+\. |#|>|\|)/.test(line);
    if (joins) out[out.length - 1] = `${prev} ${line.trim()}`;
    else out.push(line);
    if (opens) fence = !fence;
  }
  return out.join("\n");
};

const blocksText = (b) => (b.length ? ` (blocks slice${b.length > 1 ? "s" : ""} ${b.join(", ")})` : "");

/** The goal issue's body: the plain card, the progress, what is stuck, who leads it and where it stands (K33). */
export const goalBody = (g, briefUrl, view) =>
  [
    goalMarker(g.number),
    `> Written by \`tools/github/sync.mjs\` from [the brief](${briefUrl}) and this milestone's issues. Edit the brief, not this page.`,
    "",
    "## The goal, in plain words",
    "",
    g.card ? unwrap(g.card) : "_The brief has no plain goal card yet: its lead adds one (the `github` skill, \"A goal's brief\")._",
    "",
    "## Progress",
    "",
    view.total
      ? `**${view.done} of ${view.total} slices done.** ${view.ready.length ? `Ready now: ${view.ready.map((s) => `slice ${s.number}, ${s.title}`).join("; ")}.` : view.done === view.total ? "Every slice is done." : "Nothing is ready: every open slice waits on something."} The slices are this issue's sub-issues.`
      : "The brief lists no slices yet.",
    "",
    "## Open snags",
    "",
    view.snags.length ? view.snags.map((s) => `- #${s.number} ${s.title}${blocksText(s.blocks)}`).join("\n") : "None.",
    "",
    "## Waiting on other goals",
    "",
    view.waiting.length ? view.waiting.map((w) => `- #${w.number} ${w.title}, in ${w.milestone ?? "no milestone"}${blocksText(w.blocks)}`).join("\n") : "Nothing.",
    "",
    "## Who leads it",
    "",
    [
      line("Status", g.status ?? "not set"),
      line("Lead", g.lead && g.lead.harness ? [g.lead.harness, g.lead.model, g.lead.since && `since ${g.lead.since}`].filter(Boolean).join(", ") : "nobody yet"),
    ].join("  \n"),
    "",
    "## Where it stands",
    "",
    g.stands ? unwrap(g.stands) : "Nothing yet: the lead rewrites the brief's last section at every merge.",
    "",
    "## The details",
    "",
    [
      line("Brief", `[${g.brief}](${briefUrl})`),
      line("Branch", g.branch && `\`${g.branch}\`${g.base ? `, from \`${g.base}\`` : ""}`),
      line("Release", g.release),
      line("Done check", g.done_check && `\`${g.done_check}\``),
    ].filter(Boolean).join("  \n"),
    g.owns.length ? `\n**Owns:**\n${g.owns.map((p) => `- \`${p}\``).join("\n")}` : null,
  ]
    .filter((x) => x !== null)
    .join("\n");

export const sliceBody = (g, s, briefUrl) =>
  [
    sliceMarker(g.number, s.number),
    `Slice ${s.number} of Goal ${g.number}. What it is and its "done when" are in [the brief](${briefUrl}), slice ${s.number}.`,
    s.after.length ? `It starts after slice${s.after.length > 1 ? "s" : ""} ${s.after.join(", ")} (the "blocked by" links).` : null,
    "It closes when the pull request that lands it merges: `Closes #<this>` into main, or `gh issue close` by its author into a goal branch (the `github` skill).",
  ]
    .filter((x) => x !== null)
    .join("\n");

const labelsFor = (g, kind) => [kind, `goal-${g.number}`, ...(g.release && RELEASE[g.release] ? [RELEASE[g.release]] : [])];

/**
 * goals: what `readGoal` returned for each brief. state: { labels, milestones, issues } as GitHub holds them
 * (issues: { number, title, body, state, pullRequest, labels: [names], milestone: title|null, type: name|null,
 * subIssues: [numbers], blockedBy: [numbers] }).
 * briefUrl: (goal) => a link to its brief. migrate: also move open issues and pull requests from `goal-<n>` labels and
 * release milestones to goal milestones and release labels (K33's one-off seed).
 */
export const plan = ({ goals, state, briefUrl, migrate = false }) => {
  const steps = [];
  const labelByName = new Map(state.labels.map((l) => [l.name, l]));
  for (const want of LABELS) {
    const have = labelByName.get(want.name);
    if (!have) steps.push({ do: "createLabel", ...want });
    else if (have.color !== want.color || have.description !== want.description) steps.push({ do: "updateLabel", ...want });
  }

  if (own(state)) for (const want of ISSUE_TYPES) if (!(state.types ?? []).includes(want.name)) steps.push({ do: "createIssueType", ...want });
  // Every trusted issue of a kind carries that kind's type, so a filter by type finds them all.
  for (const i of state.issues) {
    const kind = i.labels.find((l) => l.startsWith("kind:"))?.slice(5);
    if (i.pullRequest || i.trusted === false || !kind || !NATIVE[kind] || (i.state && i.state !== "open")) continue;
    if (i.type !== typeOf(kind, state)) steps.push({ do: "setType", number: i.number, type: typeOf(kind, state) });
  }

  const milestoneByTitle = new Map(state.milestones.map((m) => [m.title, m]));
  // Only a trusted issue carrying the kind's label is the sync's own: a pull request, an outsider's issue or any other
  // that quotes a marker (a template, a review) is never taken for it. The oldest wins, so a later copy can't displace it.
  const byMarker = (marker, kind) =>
    state.issues
      .filter((i) => !i.pullRequest && i.trusted !== false && i.labels.includes(kind) && (i.body ?? "").includes(marker))
      .sort((x, y) => x.number - y.number)[0];
  for (const g of goals) {
    const url = briefUrl(g);
    const description = `Goal ${g.number}. Brief: ${g.brief}.${g.done_check ? ` Done check: ${g.done_check}.` : ""}`;
    const ms = milestoneByTitle.get(g.milestone);
    if (!ms) steps.push({ do: "createMilestone", title: g.milestone, description });
    else if (ms.description !== description) steps.push({ do: "updateMilestone", number: ms.number, title: g.milestone, description });

    const goalIssue = byMarker(goalMarker(g.number), "kind:goal");
    const body = goalBody(g, url, goalView(g, state));
    const title = `Goal ${g.number}: ${g.title}`;
    if (!goalIssue) steps.push({ do: "createIssue", key: `goal ${g.number}`, title, body, type: typeOf("goal", state), labels: labelsFor(g, "kind:goal"), milestone: g.milestone });
    else if (goalIssue.body !== body || goalIssue.title !== title) steps.push({ do: "updateIssue", number: goalIssue.number, title, body });

    for (const s of g.slices) {
      if (s.number === null) continue;
      const marker = sliceMarker(g.number, s.number);
      const sliceIssue = byMarker(marker, "kind:slice");
      const sTitle = `Goal ${g.number} · ${s.number} · ${s.title}`;
      if (!sliceIssue) {
        steps.push({ do: "createIssue", key: `slice ${g.number}.${s.number}`, title: sTitle, body: sliceBody(g, s, url), type: typeOf("slice", state), labels: labelsFor(g, "kind:slice"), milestone: g.milestone });
        steps.push({ do: "addSubIssue", parent: goalIssue ? goalIssue.number : `goal ${g.number}`, child: `slice ${g.number}.${s.number}` });
      } else {
        if (sliceIssue.title !== sTitle) steps.push({ do: "updateIssue", number: sliceIssue.number, title: sTitle });
        if (goalIssue && !(goalIssue.subIssues ?? []).includes(sliceIssue.number)) steps.push({ do: "addSubIssue", parent: goalIssue.number, child: sliceIssue.number });
      }
    }

    // "Blocked by" links for the order the brief gives (`(after 4)`); asks and snags are linked by hand (the skill).
    const ref = (n) => byMarker(sliceMarker(g.number, n), "kind:slice") ?? null;
    // A link between two of this goal's slices that the brief no longer gives goes first, so a reordered brief never
    // leaves a stale link or makes a cycle. Links to anything else (a snag, an ask, another goal's slice) stay.
    const sliceAt = new Map(g.slices.map((s) => [ref(s.number)?.number, s.number]).filter(([n]) => n !== undefined));
    for (const s of g.slices) {
      const issue = ref(s.number);
      for (const n of issue?.blockedBy ?? []) {
        const a = sliceAt.get(n);
        if (a === undefined || (s.after ?? []).includes(a)) continue;
        steps.push({ do: "removeBlockedBy", issue: issue.number, blocker: n, title: `slice ${g.number}.${s.number} no longer after ${a}` });
      }
    }
    for (const s of g.slices) {
      for (const a of s.after ?? []) {
        if (!g.slices.some((x) => x.number === a)) continue;
        const [issue, blocker] = [ref(s.number), ref(a)];
        if (issue && blocker && (issue.blockedBy ?? []).includes(blocker.number)) continue;
        steps.push({ do: "addBlockedBy", issue: issue ? issue.number : `slice ${g.number}.${s.number}`, blocker: blocker ? blocker.number : `slice ${g.number}.${a}`, title: `slice ${g.number}.${s.number} after ${a}` });
      }
    }
  }

  // K45: an open issue whose goals are all parked carries `parked`, so the board's views leave it out; nothing is closed.
  // An issue a running goal shares or claims (its goal label or a lane), a board row and a pull request are never parked,
  // and the label comes off when the goal resumes.
  const parked = new Set(goals.filter((g) => g.status === "parked").map((g) => g.number));
  const running = new Set(goals.filter((g) => g.status !== "parked").map((g) => g.number));
  for (const i of state.issues) {
    if (i.pullRequest || i.trusted === false || (i.state && i.state !== "open")) continue;
    const of = (prefix) => i.labels.filter((l) => new RegExp(`^${prefix}\\d+$`).test(l)).map((l) => Number(l.slice(prefix.length)));
    const goalsOf = of("goal-");
    const want = !i.labels.some((l) => BOARD_KINDS.includes(l)) && goalsOf.length > 0 && goalsOf.every((n) => parked.has(n)) && !of("lane:goal-").some((n) => running.has(n));
    const has = i.labels.includes("parked");
    if (want !== has) steps.push({ do: "setParked", number: i.number, parked: want, title: `#${i.number} ${want ? "parked" : "no longer parked"}` });
  }

  if (migrate) {
    const milestoneOfGoal = new Map(goals.map((g) => [g.number, g.milestone]));
    for (const i of state.issues) {
      if (i.state && i.state !== "open") continue;
      const goalLabel = i.labels.find((l) => /^goal-\d+$/.test(l));
      const target = goalLabel && milestoneOfGoal.get(Number(goalLabel.slice(5)));
      const release = i.milestone && RELEASE_OF_MILESTONE[i.milestone];
      if (!target && !release) continue;
      const labels = release && !i.labels.includes(release) ? [release] : [];
      const milestone = target && i.milestone !== target ? target : null;
      if (labels.length || milestone) steps.push({ do: "moveIssue", number: i.number, addLabels: labels, milestone });
    }
  }
  return steps;
};
