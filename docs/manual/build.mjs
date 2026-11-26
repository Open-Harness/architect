// Builds the manual as one page: node docs/manual/build.mjs  ->  docs/manual/out/manual.html
// The page is the markdown in this folder, in the order spine.json gives: the opening, each chapter in its part (one that is
// not written is shown in its place), then the reference. A chapter's `Film:` line becomes a player under its first paragraph. It looks for <film>-720.mp4 and <film>.captions.txt beside the page (a 720p encode of the
// render, and its captions as WebVTT text); they are published with the page and are not in the repository.
// Run check.mjs first: this trusts every quote the chapters make.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname, read = (p) => readFileSync(join(here, p), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// A link inside the manual becomes a jump on the page. A link to the canon is shown as the name of its page, since the canon
// is not part of this page yet.
const inside = { "working-with-your-agents.md": "working-with-your-agents", "../working-with-your-agents.md": "working-with-your-agents", "kit/README.md": "the-agent-kit", "../kit/README.md": "the-agent-kit" };
const inline = (text) => esc(text)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
  .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, words, to) => {
    if (inside[to]) return `<a href="#${inside[to]}">${words}</a>`;
    const canon = /canon\/([a-z-]+)\.mdx?$/.exec(to);
    return canon ? `<span class="canon" title="explained in the canon, docs/canon/${canon[1]}.mdx">${words}</span>` : words;
  });
const mark = (line) => esc(line).replace(/✘/g, '<span class="no">✘</span>').replace(/✔/g, '<span class="ok">✔</span>');

// What was recorded or quoted sits between two hairlines, with one caption that says where it is from and how much of it is shown.
function block(info, body) {
  const capture = /capture=(\S+)/.exec(info), source = /file=(\S+) lines=(\d+)-(\d+)/.exec(info), shown = body.split("\n");
  const rows = shown.map((l) => (l.startsWith("$ ") ? `<b>${esc(l)}</b>` : mark(l))).join("\n");
  const all = capture ? read(`captures/${capture[1]}`).replace(/\n$/, "").split("\n").length : 0;
  const from = capture ? `recorded · captures/${capture[1]}${shown.length < all ? ` · ${shown.length} of its ${all} lines` : ""}` : source ? `quoted · ${source[1]} · lines ${source[2]} to ${source[3]}` : "";
  return `<figure><pre>${rows}</pre><figcaption>${from}</figcaption></figure>`;
}

function page(text, { level = 2, id, film } = {}) {
  const rows = text.replace(/\n$/, "").split("\n"), out = []; let i = 0, title = "", lede = false, hold = "";
  const para = (stop) => { const got = []; while (i < rows.length && rows[i] !== "" && !stop(rows[i])) got.push(rows[i++]); return got.join(" "); };
  const starts = (l) => /^(#{1,3} |```|\| |- |\d+\. )/.test(l);
  while (i < rows.length) {
    const l = rows[i];
    if (l === "") { i++; continue; }
    let m;
    if ((m = /^# (.+)$/.exec(l))) { title = m[1]; out.push(`<h${level} id="${id}">${inline(m[1])}</h${level}>`); i++; continue; }
    if ((m = /^(##+) (.+)$/.exec(l))) { const h = level + m[1].length - 1; out.push(`<h${h} id="${id}-${slug(m[2])}">${inline(m[2])}</h${h}>`); i++; continue; }
    if ((m = /^Film: `docs\/explainer\/films\/([a-z-]+)\/`/.exec(l))) { hold = film(m[1]); i++; continue; }
    if (/^Film: none yet/.test(l)) { i++; continue; }
    if ((m = /^```(.*)$/.exec(l))) { const body = []; i++; while (rows[i] !== "```") body.push(rows[i++]); i++; out.push(m[1].includes("=") ? block(m[1], body.join("\n")) : `<pre class="code plain">${body.map((b) => `<span class="ln">${esc(b) || " "}</span>`).join("")}</pre>`); continue; }
    if (l.startsWith("| ")) {
      const table = []; while (i < rows.length && rows[i].startsWith("|")) table.push(rows[i++].slice(1, -1).split(" | ").map((c) => c.trim()));
      out.push(`<div class="tablewrap"><table><tr>${table[0].map((c) => `<th>${inline(c)}</th>`).join("")}</tr>${table.slice(2).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</table></div>`); continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d/.test(l), items = [];
      while (i < rows.length && (/^(- |\d+\. )/.test(rows[i]) || /^ {2,}\S/.test(rows[i]) || (rows[i] === "" && /^(```|- |\d+\. )/.test(rows[i + 1] ?? "") && items.length))) {
        if (rows[i] === "") { i++; continue; }
        if (rows[i].startsWith("```")) { const info = rows[i].slice(3), body = []; i++; while (rows[i] !== "```") body.push(rows[i++]); i++; items[items.length - 1] += block(info, body.join("\n")); continue; }
        if (/^(- |\d+\. )/.test(rows[i])) items.push(inline(rows[i].replace(/^(- |\d+\. )/, ""))); else items[items.length - 1] += " " + inline(rows[i].trim());
        i++;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${x}</li>`).join("")}</${ordered ? "ol" : "ul"}>`); continue;
    }
    const words = para(starts);
    // A chapter's first paragraph is its opening, set larger; its film follows it.
    if (lede === false && level === 2 && title) { lede = true; out.push(`<p class="lede">${inline(words)}</p>`); if (hold) out.push(hold); } else out.push(`<p>${inline(words)}</p>`);
  }
  return { title, html: out.join("\n") };
}

const film = (name) => `<figure class="film"><video controls preload="metadata" playsinline src="${name}-720.mp4" data-captions="${name}.captions.txt"></video><figcaption>The film of this chapter. Its voice is synthesised, and nobody has listened to it yet.</figcaption></figure>`;
const spine = JSON.parse(read("spine.json")), all = spine.parts.flatMap((p) => p.chapters), last = all[all.length - 1].n;
const chapter = (c, part) => {
  const id = "chapter-" + c.n, head = `<div class="block"><span>Chapter</span><b>${c.n} of ${last} · ${esc(part)}</b><span>Asks</span><b>${esc(c.question)}</b>${c.file ? "" : "<span>Stands</span><b>not written yet</b>"}</div>`;
  if (!c.file) return `<section class="chapter unwritten" id="${id}">${head}<h2>${esc(c.title)}</h2></section>`;
  return `<section class="chapter">${head}${page(read(c.file), { id, film }).html}</section>`;
};
const opening = page(read(spine.opening.file), { id: "opening", film });
const contents = `<nav><a href="#opening">Why this exists</a>${spine.parts.map((p) => `<span>${esc(p.title)}</span>${p.chapters.map((c) => `<a href="#chapter-${c.n}"${c.file ? "" : ' class="unwritten"'}>${c.n} · ${esc(c.title)}</a>`).join("")}`).join("")}<span>Reference</span>${spine.reference.map((r) => `<a href="#${slug(r.title)}">${esc(r.title)}</a>`).join("")}</nav>`;

const body = `<main>
<div class="block"><span>Manual</span><b>Orthograph, built with your agents</b><span>App</span><b>Plugged In, examples/plugged-in</b><span>Written</span><b>${all.filter((c) => c.file).length} of ${last} chapters</b></div>
<section class="chapter" style="border:0;margin:0;padding:0">${opening.html}</section>
${contents}
${spine.parts.map((p) => `<p class="part">${esc(p.title)}</p>\n${p.chapters.map((c) => chapter(c, p.title)).join("\n")}`).join("\n")}
<p class="part">Reference</p>
${spine.reference.map((r) => `<section class="chapter reference">${page(read(r.file), { id: slug(r.title), film }).html}</section>`).join("\n")}
</main>`;

mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out/manual.html"), read("page/head.html") + body + "\n" + read("page/script.html"));
console.log(`built docs/manual/out/manual.html: ${all.filter((c) => c.file).length} of ${last} chapters written, ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
