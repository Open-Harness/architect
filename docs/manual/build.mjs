// Builds the manual as one page: node docs/manual/build.mjs  ->  docs/manual/out/manual.html
// The page is the markdown in this folder and nothing else: the first page, each chapter, and the kit's own page. A chapter's
// `Film:` line becomes a player. It looks for <film>-720.mp4 and <film>.captions.txt beside the page (a 720p encode of the
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
    return canon ? `<span class="canon" title="docs/canon/${canon[1]}.mdx">${words}<i>canon · ${canon[1]}</i></span>` : words;
  });
const mark = (line) => esc(line).replace(/✘/g, '<span class="no">✘</span>').replace(/✔/g, '<span class="ok">✔</span>');

function block(info, body) {
  const capture = /capture=(\S+)/.exec(info), source = /file=(\S+) lines=(\d+)-(\d+)/.exec(info);
  const rows = body.split("\n").map((l) => `<span class="ln${l.startsWith("$ ") ? " cmd" : ""}">${mark(l) || " "}</span>`).join("");
  const from = capture ? `<span>docs/manual/captures/${capture[1]}</span><em class="run">recorded</em>` : source ? `<span>${source[1]} · lines ${source[2]} to ${source[3]}</span><em class="is">quoted</em>` : "";
  return `<figure class="file"><figcaption>${from}</figcaption><pre class="code${capture ? " term" : ""}">${rows}</pre></figure>`;
}

function page(text, { level = 2, id, film } = {}) {
  const rows = text.replace(/\n$/, "").split("\n"), out = []; let i = 0, title = "";
  const para = (stop) => { const got = []; while (i < rows.length && rows[i] !== "" && !stop(rows[i])) got.push(rows[i++]); return got.join(" "); };
  const starts = (l) => /^(#{1,3} |```|\| |- |\d+\. )/.test(l);
  while (i < rows.length) {
    const l = rows[i];
    if (l === "") { i++; continue; }
    let m;
    if ((m = /^# (.+)$/.exec(l))) { title = m[1]; out.push(`<h${level} id="${id}">${inline(m[1])}</h${level}>`); i++; continue; }
    if ((m = /^(##+) (.+)$/.exec(l))) { const h = level + m[1].length - 1; out.push(`<h${h} id="${id}-${slug(m[2])}">${inline(m[2])}</h${h}>`); i++; continue; }
    if ((m = /^Film: `docs\/explainer\/films\/([a-z-]+)\/`/.exec(l))) { out.push(film(m[1], title)); i++; continue; }
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
    out.push(words.startsWith("**How it stands.**") ? `<p class="stands">${inline(words)}</p>` : `<p>${inline(words)}</p>`);
  }
  return { title, html: out.join("\n") };
}

const film = (name, title) => `<figure class="film"><video controls preload="metadata" playsinline src="${name}-720.mp4" data-captions="${name}.captions.txt"></video><figcaption>The film of this chapter: ${esc(title.replace(/^\d+ · /, ""))}. Its voice is synthesised and nobody has listened to it yet.</figcaption></figure>`;
const chapters = readdirSync(join(here, "chapters")).filter((f) => f.endsWith(".md")).sort().map((f) => page(read(`chapters/${f}`), { id: "chapter-" + f.slice(0, 2), film }));
const agents = page(read("working-with-your-agents.md"), { id: "working-with-your-agents" });
const kit = page(read("kit/README.md"), { id: "the-agent-kit" });
const nav = [["working-with-your-agents", "Working with your agents"], ...chapters.map((c, k) => ["chapter-" + readdirSync(join(here, "chapters")).filter((f) => f.endsWith(".md")).sort()[k].slice(0, 2), c.title]), ["the-agent-kit", "The agent kit"], ["to-come", "What is not written yet"]];

const body = `<div class="wrap">
<header><div class="eyebrow">Orthograph · the manual · a pilot of three chapters</div>
<h1>Build a real thing, with your agents</h1>
<p class="lede">For the person who directs the work and reads the blueprint, and who does not have to read the code. Each chapter says what you do, what your agent does, what you read and what goes wrong, and has a film.</p>
<div class="legend"><span><em class="st run">recorded</em> printed by a real run on examples/plugged-in</span><span><em class="st is">quoted</em> read from a file in the repository</span><span><em class="st can">canon</em> where a word is explained</span></div>
<nav>${nav.map(([to, words]) => `<a href="#${to}">${esc(words)}</a>`).join("")}</nav></header>
<section>${agents.html}</section>
${chapters.map((c) => `<section class="chapter">${c.html}</section>`).join("\n")}
<section>${kit.html}</section>
<section><h2 id="to-come">What is not written yet</h2>
<p>These three chapters are a pilot, to fix the format. The rest of the manual is planned and not started.</p>
<ul>${["Plan it, before any code", "Describe it", "Spike what you doubt", "Review without reading the code", "Stage it", "Watch it", "Change it, months later", "More than one agent"].map((c) => `<li>${c}</li>`).join("")}<li>Reading a blueprint: one guided read of a real one</li><li>The primitives that have no canon page yet: roles, journeys, proof, environments, secrets, sign-in and the portal among them</li></ul></section>
</div>`;

mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out/manual.html"), read("page/head.html") + body + "\n" + read("page/script.html"));
console.log(`built docs/manual/out/manual.html: ${chapters.length} chapters, ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
