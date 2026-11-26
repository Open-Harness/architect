// Builds the manual as one page: node docs/manual/build.mjs  ->  docs/manual/site/index.html (a whole page, committed, to open
// from the repository) and docs/manual/out/manual.html (the same page as an artifact's body, beside site/films/).
// The page is the markdown in this folder, in the order spine.json gives: the opening, each chapter in its part (one that is
// not written is shown in its place), then the reference. A chapter's `Film:` line becomes a player under its first paragraph,
// from site/films/<film>.mp4 (a 720p encode of the render), <film>.jpg (its poster) and <film>.captions.txt (WebVTT as text).
// `node docs/manual/films.mjs` makes those three from the renders in docs/explainer/out/.
// Run check.mjs first: this trusts every quote the chapters make.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
  return `<figure class="rec"><figcaption><span class="kind">${capture ? "recorded" : "quoted"}</span><span>${esc(from.replace(/^(recorded|quoted) · /, ""))}</span></figcaption><pre>${rows}</pre></figure>`;
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

const words = (n) => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][n] ?? String(n);
const film = (name) => !existsSync(join(here, "site/films", `${name}.mp4`))
  ? `<p class="soon">The film of this chapter is still being made.</p>`
  : `<figure class="film"><video controls preload="none" playsinline poster="films/${name}.jpg" src="films/${name}.mp4" data-captions="films/${name}.captions.txt"></video><figcaption>The film of this chapter. Its voice is synthesised, and nobody has listened to it yet.</figcaption></figure>`;
const spine = JSON.parse(read("spine.json")), all = spine.parts.flatMap((p) => p.chapters), last = all[all.length - 1].n;
const partNames = ["one", "two", "three", "four", "five"];
const chapter = (c, part) => {
  const id = "chapter-" + c.n, num = String(c.n).padStart(2, "0");
  const head = `<header class="opener"><span class="num">${num}</span><span class="of">${esc(part)}</span></header>`;
  if (!c.file) return `<section class="chapter unwritten" id="${id}">${head}<h2>${esc(c.title)}</h2><p class="ask">${esc(c.question)}</p></section>`;
  const body = page(read(c.file), { id, film }).html.replace(/(<h2 id="[^"]+">[^<]*<\/h2>)/, `$1<p class="ask">${esc(c.question)}</p>`);
  return `<section class="chapter" id="${id}-wrap">${head}${body}</section>`;
};
const opening = page(read(spine.opening.file), { id: "opening", film });
const navlink = (to, n, t, cls = "") => `<a href="#${to}" data-to="${to}"${cls ? ` class="${cls}"` : ""}>${n ? `<i>${n}</i>` : ""}<span>${esc(t)}</span></a>`;
const contents = `<nav class="toc" aria-label="Contents"><p class="toc-title">The manual</p>${navlink("opening", "", spine.opening.title)}${spine.parts.map((p, k) => `<p class="toc-part">Part ${partNames[k]} · ${esc(p.title)}</p>${p.chapters.map((c) => navlink("chapter-" + c.n, c.n, c.title, c.file ? "" : "unwritten")).join("")}`).join("")}<p class="toc-part">Reference</p>${spine.reference.map((r) => navlink(slug(r.title), "", r.title)).join("")}</nav>`;
const written = all.filter((c) => c.file).length, filmed = [spine.opening, ...all].filter((c) => existsSync(join(here, "site/films", `${c.film}.mp4`))).length;

const body = `<div class="shell">
${contents}
<main>
<header class="mast"><p class="eyebrow">Orthograph · the manual</p><h1>Build a real thing, with your agents</h1>
<p class="sub">For the person who directs the work and reads the blueprint. One small app, Plugged In, from the first conversation about it to a change made months later, in ${words(last)} chapters, each with a film.</p>
<p class="facts"><span>${words(written)} of ${words(last)} chapters written</span><span>${words(filmed)} films</span><span>every command recorded on <code>examples/plugged-in</code></span></p></header>
<section class="chapter first">${opening.html}</section>
${spine.parts.map((p, k) => `<div class="part"><span>Part ${partNames[k]}</span><h2 class="part-title">${esc(p.title)}</h2></div>\n${p.chapters.map((c) => chapter(c, `Part ${partNames[k]} · ${p.title}`)).join("\n")}`).join("\n")}
<div class="part"><span>At the back</span><h2 class="part-title">Reference</h2></div>
${spine.reference.map((r) => `<section class="chapter reference">${page(read(r.file), { id: slug(r.title), film }).html}</section>`).join("\n")}
</main>
</div>`;

const head = read("page/head.html"), script = read("page/script.html");
mkdirSync(join(here, "out"), { recursive: true }); mkdirSync(join(here, "site"), { recursive: true });
writeFileSync(join(here, "out/manual.html"), head + body + "\n" + script);
writeFileSync(join(here, "site/index.html"), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}</head>\n<body>\n${body}\n${script}</body></html>\n`);
console.log(`built docs/manual/site/index.html and out/manual.html: ${written} of ${last} chapters written, ${filmed} films, ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
