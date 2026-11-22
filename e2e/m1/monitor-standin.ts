// The reference page of check 39: a client the check can run anywhere, drawn from the portal's data API alone (`/_portal/v1/blueprint`, `monitor`, `snapshot`),
// as the real client (HeroUI Pro, built only in CI) must draw the same pages. It exists so that the judge in `monitor-judge.ts` is proved able to pass, and able
// to fail, without that client. Written as plain JS in one string so that each control can plant one fault by replacing one phrase of it.
export const standIn = (): string => `<!doctype html><html><head><meta charset="utf-8"><title>reference</title></head><body><script>
const get = async (p) => (await fetch(p)).json();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const subjectOf = (r) => r.labels.operation ?? r.labels.code ?? r.labels.journey;
const order = (a, b) => (a.state === "firing" ? 0 : 1) - (b.state === "firing" ? 0 : 1) || (a.severity === "page" ? 0 : 1) - (b.severity === "page" ? 0 : 1);
(async () => {
  const bp = await get("/_portal/v1/blueprint");
  const rules = Object.fromEntries((bp.model.alertRules ?? []).map((r) => [r.id, r]));
  const m = await get("/_portal/v1/monitor?digest=" + bp.digest);
  const path = location.pathname;
  const alerts = () => '<h1>Alerts</h1><p data-portal="alerts-delivery" data-sent="false" data-environment="' + esc(m.environment) + '">Shown here. Not sent.</p>'
    + m.alerts.slice().sort(order).map((a) => { const r = rules[a.rule]; return '<div data-portal="alert-row" data-rule="' + esc(a.rule) + '" data-alert="' + esc(a.alert) + '" data-kind="' + r.kind + '" data-subject="' + esc(subjectOf(r)) + '" data-severity="' + a.severity + '" data-owner="' + esc(r.labels.owner) + '" data-state="' + a.state + '"><b>' + esc(subjectOf(r)) + '</b> ' + a.alert + ' ' + a.state + ' <i>' + esc(r.labels.owner) + '</i></div>'; }).join("");
  const issues = () => '<h1>Issues</h1>' + m.issues.map((i) => '<div data-portal="issue-row" data-key="' + esc(i.key) + '" data-operation="' + esc(i.operation) + '" data-step="' + esc(i.step) + '" data-tag="' + esc(i.tag) + '" data-owner="' + esc(i.owner) + '" data-occurrences="' + i.occurrences + '" data-first-seen="' + i.firstSeen.at + '" data-first-hash="' + i.firstSeen.hash + '" data-last-seen="' + i.lastSeen.at + '" data-last-hash="' + i.lastSeen.hash + '" data-regressed="' + i.regressed + '"><b>' + esc(i.key) + '</b> <span>' + i.occurrences + '</span> <span>' + new Date(i.firstSeen.at).toISOString() + '</span> <span>' + new Date(i.lastSeen.at).toISOString() + '</span> <i>' + esc(i.owner) + '</i>' + (i.regressed ? ' <span data-portal="regressed-badge">regressed</span>' : '') + '</div>').join("");
  const home = async () => {
    const snap = await get("/_portal/v1/snapshot?digest=" + bp.digest);
    const rows = snap.telemetry?.calls?.value?.rows ?? [];
    const firing = [...new Set(m.alerts.filter((a) => a.state === "firing").map((a) => a.rule))].map((id) => ({ id, severity: m.alerts.some((a) => a.rule === id && a.state === "firing" && a.severity === "page") ? "page" : "ticket" })).sort((a, b) => (a.severity === "page" ? 0 : 1) - (b.severity === "page" ? 0 : 1));
    const breaches = Object.keys(bp.model.operations).filter((op) => { const d = rows.filter((r) => r.operation === op).map((r) => r.durationMs).sort((x, y) => x - y); const budget = bp.model.operations[op].budget; return budget && d.length > 0 && d[Math.ceil(0.95 * d.length) - 1] > budget.p95Ms; });
    const item = (kind, subject, extra, href) => '<div data-portal="worst-item" data-kind="' + kind + '" data-subject="' + esc(subject) + '"' + extra + '><a href="' + href + '">' + esc(subject) + '</a></div>';
    return '<h1>Plugged In</h1><section data-portal="worst-first">'
      + firing.map((f) => item("alert", f.id, ' data-severity="' + f.severity + '"', "/portal/monitor/alerts")).join("")
      + m.issues.map((i) => item("issue", i.key, ' data-regressed="' + i.regressed + '"', "/portal/monitor/issues")).join("")
      + breaches.map((op) => item("breach", op, "", "/portal/operations/" + op + "?tab=metrics")).join("")
      + '</section>';
  };
  const body = path === "/portal/monitor/alerts" ? alerts() : path === "/portal/monitor/issues" ? issues() : path === "/portal" ? await home() : "";
  document.body.innerHTML = '<div data-portal="page" data-ready="true" data-status="200">' + body + '</div>';
})();
</script></body></html>`;
