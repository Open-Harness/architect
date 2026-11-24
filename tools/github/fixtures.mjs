// Shared by the board's tests: a status page in a few rows, and what GitHub would hold for them.
import { APP_MILESTONES, BOARD_COLUMNS, NOT_YET_NEEDED, parseBoard } from "./board.mjs";
import { boardPlan, itemBody, itemLabels } from "./boardPlan.mjs";
import { LABELS, typeOf } from "./plan.mjs";

const head = `| ${BOARD_COLUMNS.join(" | ")} |\n|${BOARD_COLUMNS.map(() => "---").join("|")}|`;
export const page = (...lines) => `# Status\n\n## 1. The releases\n\n| id | other |\n|---|---|\n| x | y |\n\n## 2. The capability map\n\nProse.\n\n### A group\n\n${head}\n${lines.join("\n")}\n\n## 3. Holes\n`;
export const row = (id, item, stage, by, release, milestone, lane, touches, needs, evidence) =>
  `| ${[id, item, stage, by, release, milestone, lane, touches, needs, evidence].join(" | ")} |`;

export const sample = page(
  row("secrets", "Secrets by declaration: per environment only", "building", "superagent", "beta", "coding agent", "goal-17", "`packages/host-cloudflare`, `packages/orthograph/src/modules/secrets`", "—", "#690; slice M2.04"),
  row("things", "Things: fields, machines", "built", "framework", "preview", "—", "none", "`packages/orthograph/src/modules/things`", "—", "slice M1.03"),
  row("sign-in", "Sign-in (`@orthograph/auth`: people, sessions): Better Auth", "provisional", "superagent", "1.0", "launch", "none", "`packages/auth`", "secrets, things", "slices M2.05"),
  row("reports", "Reports: the books' statements", "provisional", "Capxul", "1.0", "books", "none", "`packages/projections`", "things", "K42"),
  row("gap-node-host", "Node host: the server runs only as a Worker", "provisional", "framework", "—", "—", "none", "—", "—", "no slice"),
);

export const empty = { labels: [], milestones: [], issues: [], ownerType: "Organization", types: [] };
export const url = "https://example.test/status.md";
export const plan = (rows, state, due) => boardPlan({ rows, state, statusUrl: url, typeOf, due });
export const { rows } = parseBoard(sample);

export const held = (rows, over = {}) => ({
  labels: [...LABELS, { name: "lane:goal-17", color: "c2e0c6", description: "Claimed by Goal 17: it works this item and its paths (K42, section 3)" }],
  milestones: Object.values(APP_MILESTONES).map((m, k) => ({ number: k + 1, ...m })).concat([{ number: 99, title: NOT_YET_NEEDED, description: "Board items no app has pulled yet, with no date (K42, section 5)." }]),
  ownerType: "Organization",
  types: [],
  issues: rows.map((r, k) => ({
    number: 100 + k, title: r.name, body: itemBody(r, url), state: r.stage === "built" ? "closed" : "open", trusted: true, pullRequest: false,
    labels: itemLabels(r), milestone: r.milestone ? APP_MILESTONES[r.milestone].title : NOT_YET_NEEDED, ...over,
  })),
});
