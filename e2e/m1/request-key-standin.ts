// Check 38's stand-in client (M1.12a): a page that draws an operation's calls table from the data API alone (`/_portal/v1/snapshot`, `telemetry.calls.value.rows`)
// with the request-key column and filter as the portal's design says (the hooks are check 21's). It is not the portal: the real client needs a
// HeroUI Pro licence and is judged in CI. It lets the judge be shown to pass a right table and refuse each wrong one, on any machine.
const BODY = `
const route = location.pathname.replace(/^\\/portal/, "") || "/";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const COLS = ["time", "environment", "caller", "outcome", "duration", "request-key", "attempts"];
const [, kind, name] = route.split("/");
fetch("/_portal/v1/blueprint").then((x) => x.json()).then((b) => fetch("/_portal/v1/snapshot?digest=" + b.digest).then((x) => x.json())).then((snapshot) => {
  const held = ((snapshot.telemetry && snapshot.telemetry.calls.state === "available" && snapshot.telemetry.calls.value.rows) || []).filter((c) => kind === "operations" && c.operation === name);
  const keyed = held.some((c) => c.requestKey !== null);
  const shown = (c) => /*SHOWN*/ c.requestKey ?? (keyed ? "none" : "not yet");
  const root = document.getElementById("root");
  const rows = (term) => held.filter((c) => /*MATCH*/ (c.requestKey ?? "").includes(term)).map((c) =>
    '<tr data-portal="call-row" data-trace="' + c.trace + '" data-operation="' + c.operation + '" data-outcome="' + c.outcome + '" data-request-key="' + esc(shown(c)) + '">'
    + '<td>' + new Date(c.start).toISOString() + '</td><td>' + c.environment + '</td><td>' + c.caller + '</td><td>' + c.outcome + '</td><td>' + c.durationMs + ' ms</td><td>' + esc(/*CELL*/ shown(c)) + '</td><td>' + c.attempts + '</td></tr>').join("");
  const filters = ["environment", "caller", "outcome", "request-key", "over-budget", "window"].map((f) =>
    f === "request-key" ? '<span data-portal="calls-filter" data-filter="request-key" data-available="' + /*AVAILABLE*/ keyed + '"><label>request key <input type="search" /></label></span>'
      : '<span data-portal="calls-filter" data-filter="' + f + '" data-available="' + (f !== "window") + '">' + f + "</span>").join("");
  root.innerHTML = '<main data-portal="page" data-ready="true" data-status="200"><h1>' + esc(name) + "</h1>" + filters
    + '<table><thead><tr>' + COLS.map((c) => '<th data-portal="calls-col" data-col="' + c + '">' + c + "</th>").join("") + "</tr></thead><tbody>" + rows("") + "</tbody></table></main>";
  const input = root.querySelector("input");
  input.addEventListener("input", () => { root.querySelector("tbody").innerHTML = rows(input.value); });
});`;

/** The stand-in's page, with its faults written in: each `[marker, replacement]` swaps one marked part for a wrong one (a control plants one at a time). */
export const standIn = (planted: ReadonlyArray<readonly [string, string]> = []): string => {
  let body = BODY;
  for (const [marker, replacement] of planted) {
    if (!body.includes(marker)) throw new Error(`the stand-in has no ${marker}: the control is out of date`);
    body = body.replace(marker, replacement);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>stand-in</title></head><body><div id="root"></div><script>${body}</script></body></html>`;
};
