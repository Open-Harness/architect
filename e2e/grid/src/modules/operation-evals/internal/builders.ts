import type { OperationModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

const names = (rows: ReadonlyArray<ReadonlyArray<string>>) => rows.map((r) => r[0] ?? "");
const missingOrExtra = (what: string, got: ReadonlyArray<string>, want: ReadonlyArray<string>) => [
  ...want.filter((w) => !got.includes(w)).map((w) => `${what} leaves out ${w}`),
  ...got.filter((g) => !want.includes(g)).map((g) => `${what} shows ${g}, which the model does not declare`),
];
/** What the docs and the portal say of who may call: the phrase differs by page, so only the budget is compared as a figure. */
const budget = (op: OperationModel) => `p95 ${op.budget?.p95Ms ?? "?"}ms`;

/** operation.docs: one page: the heading, the description, who may call, the budget, the idempotency line, the payload and answer fields and the refusals. */
export const docs = over("operation.docs", (op, e) => {
  const path = `generated/docs/${op.thing}/${op.verb}.md`;
  const page = e.files[path];
  if (page === undefined) return [`${path} was not generated`];
  const payload = Reading.mdSection(page, "Payload");
  const answer = Reading.mdSection(page, "Answer");
  const refusals = Reading.mdSection(page, "Refusals");
  // What the page says as words: emphasis, code spans and links taken off, so `**Budget:**` and `Budget:` are the same statement.
  // A code fence is an example, not the page's statement, so it is left out too.
  const said = Reading.plain(page.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")).replace(/\s+/g, " ");
  return [
    ...(Reading.mdTitle(page) === op.name ? [] : [`${path} has no heading "# ${op.name}"`]),
    ...(said.includes(Reading.plain(op.description ?? "\0").replace(/\s+/g, " ")) ? [] : [`${path} does not carry the description`]),
    ...(said.includes("Who may call:") ? [] : [`${path} does not say who may call`]),
    ...(said.includes(`Budget: ${budget(op)}`) ? [] : [`${path} does not show the budget "${budget(op)}"`]),
    ...((op.idempotent === null || op.idempotent === undefined) === !said.includes("Idempotent by") ? [] : [`${path} ${op.idempotent == null ? "claims" : "does not state"} idempotency, and the model ${op.idempotent == null ? "has none" : "has some"}`]),
    ...(payload === undefined ? [`${path} has no Payload section`] : missingOrExtra("the Payload table", names(Reading.mdRows(payload)), Object.keys(op.payload))),
    ...(answer === undefined ? [`${path} has no Answer section`] : Object.keys(op.answer).length === 0 ? (answer.includes("(none)") ? [] : ["the Answer section does not say (none)"]) : missingOrExtra("the Answer table", names(Reading.mdRows(answer)), Object.keys(op.answer))),
    ...(refusals === undefined ? [`${path} has no Refusals section`] : missingOrExtra("the Refusals table", names(Reading.mdRows(refusals)), op.refusals ?? [])),
  ];
});

/** operation.portal: the operation has its page (never judged on the docs it embeds) and a row on home's operations table. */
export const portal = over("operation.portal", (op, e) => {
  const route = `/portal/operations/${op.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const own = Reading.portalOwn(page);
  const contract = Reading.htmlSection(own, 2, "Contract") ?? "";
  const payload = Reading.htmlSection(own, 3, "Payload");
  const answer = Reading.htmlSection(own, 3, "Answer");
  const refusals = Reading.htmlSection(own, 3, "Refusals");
  const home = e.portal["/portal"] ?? "";
  // Home's operations matrix counts each operation's calls, refusals and defects and its p95 against the budget (K14, operation.portal).
  const matrix = Reading.htmlText(Reading.htmlSection(home, 2, "Operations") ?? "");
  return [
    ...(Reading.htmlHeadings(own, 1).includes(op.name) ? [] : [`${route} has no heading ${op.name}`]),
    ...(Reading.htmlText(own).includes(op.description ?? "\0") ? [] : [`${route} does not carry the description`]),
    ...(Reading.htmlText(contract).includes("Who may call") ? [] : [`${route}'s contract does not say who may call`]),
    ...(Reading.htmlText(contract).includes(`Budget: ${budget(op)}`) ? [] : [`${route}'s contract does not show the budget "${budget(op)}"`]),
    ...(payload === undefined ? [`${route} has no Payload table`] : missingOrExtra("the Payload table", names(Reading.htmlRows(payload)), Object.keys(op.payload))),
    ...(answer === undefined ? [`${route} has no Answer table`] : missingOrExtra("the Answer table", names(Reading.htmlRows(answer)), Object.keys(op.answer))),
    ...(refusals === undefined ? [`${route} has no Refusals list`] : missingOrExtra("the Refusals list", Reading.htmlItems(refusals), op.refusals ?? [])),
    ...(new RegExp(`href\\s*=\\s*["']${route.replace(/\./g, "\\.")}["']`).test(home) ? [] : [`home's operations table does not link ${route}`]),
    ...["Calls", "Refused", "Defects", "p95"].filter((column) => !matrix.includes(column)).map((column) => `home's operations matrix has no ${column} column: the portal does not yet count calls from telemetry (M1.13)`),
  ];
});
