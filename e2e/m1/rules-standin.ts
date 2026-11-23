// Two stand-in clients for check 28's controls: a page that draws what G5's screen calls say, from the wire alone (so the judge can be satisfied),
// and one that writes Plugged In's words in and ignores the wire (so the judge can be shown to refuse it). Neither is the portal.
const BODY = (hardcoded: boolean) => `
const route = location.pathname.replace(/^\\/portal/, "") || "/";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const HARD = { "handle.oneHolderPerName": "another claimed handle holds this name", "handle.oneNamePerPerson": "you already hold a name", "profile.onePagePerHandle": "another profile holds this handle" };
const sentence = (thing, name, r) => ${hardcoded
  ? "HARD[thing + '.' + name] ?? 'a rule'"
  : "r.description ?? ('another ' + (r.while.length ? r.while.join(' or ') + ' ' : '') + thing + ' holds this ' + r.fields.join(' and '))"};
fetch("/_portal/v1/blueprint").then((x) => x.json()).then((b) => {
  const m = b.model;
  const ownerOf = (op, e) => (op.invariants ?? {})[e];
  const view = (op, e) => {
    const full = ownerOf(op, e);
    if (!full) return "<span>" + esc(e) + "</span>";
    const [t, n] = full.split(".");
    return '<span data-portal="refusal" data-refusal="' + e + '" data-rule="' + full + '"><b>' + e + '</b> <i data-portal="refusal-sentence">' + esc(sentence(t, n, m.things[t].invariants[n])) + '</i> <a data-portal="rule-link" href="/portal/things/' + t + '#rule-' + n + '">' + n + '</a></span>';
  };
  let body = "<p>home</p>";
  const [, kind, name] = route.split("/");
  if (kind === "things" && m.things[name]) {
    const t = m.things[name], rules = Object.entries(t.invariants ?? {});
    body = "<h1>" + name + "</h1>" + (t.machine ? '<div data-portal="lifecycle">' + t.machine.states.join(" > ") + "</div>" : "")
      + (rules.length ? '<section data-portal="rules">' + "<h2>Rules</h2>" + rules.map(([n, r]) => '<div data-portal="rule" id="rule-' + n + '" data-rule="' + name + "." + n + '" data-fields="' + r.fields.join(",") + '" data-while="' + r.while.join(",") + '" data-refuse="' + (r.refuse ?? "") + '" data-described="' + (r.description ? "true" : "false") + '"><b>' + n + '</b> <i data-portal="rule-sentence">' + esc(sentence(name, n, r)) + "</i>" + (r.refuse ? " refuses " + view({ invariants: { [r.refuse]: name + "." + n } }, r.refuse) : "") + "</div>").join("") + "</section>" : "")
      + Object.values(m.operations).filter((o) => o.thing === name).map((o) => '<div data-portal="operation-row" data-operation="' + o.name + '">' + o.name + "</div>").join("")
      + Object.keys(t.errors ?? {}).map((e) => "<p>" + view(Object.values(m.operations).find((o) => o.thing === name && ownerOf(o, e)) ?? {}, e) + "</p>").join("");
  } else if (kind === "operations" && m.operations[name]) {
    const o = m.operations[name], rules = [...new Set(o.breaks ?? [])];
    // S-31: the rules stop lists every rule the operation can break (breaks), each with its sentence and a link to its row; a rule that refuses also names its refusal.
    const stopRule = (full) => { const [t, n] = full.split("."), r = m.things[t].invariants[n];
      return '<div data-portal="spine-rule" data-rule="' + full + '"><b>' + n + '</b> <i data-portal="spine-rule-sentence">' + esc(sentence(t, n, r)) + '</i> <a data-portal="rule-link" data-in="stop" href="/portal/things/' + t + '#rule-' + n + '">' + n + '</a>' + (r.refuse ? " " + view(o, r.refuse) : "") + "</div>"; };
    body = "<h1>" + name + "</h1><ul>" + o.refusals.map((e) => "<li>" + view(o, e) + "</li>").join("") + "</ul>"
      + (o.move ? '<div data-portal="spine-stop" data-stop="move">move</div>' : "")
      + (rules.length ? '<div data-portal="spine-stop" data-stop="rules" data-rules="' + rules.join(",") + '">rules: ' + rules.map(stopRule).join("") + '</div>' : "")
      + '<div data-portal="spine-stop" data-stop="commit">commit</div>';
  } else if (route !== "/" && route !== "/reference/refusals") body = "<p>not found</p>";
  document.getElementById("root").innerHTML = '<main data-portal="page" data-ready="true" data-status="200">' + body + "</main>";
});`;
export const standIn = (hardcoded: boolean): string => `<!doctype html><html><head><meta charset="utf-8"><title>stand-in</title></head><body><div id="root"></div><script>${BODY(hardcoded)}</script></body></html>`;
