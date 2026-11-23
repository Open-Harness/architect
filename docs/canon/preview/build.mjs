// Renders docs/canon into one self-contained HTML file you can click through: every page in the outline, the
// components drawn from real data (journeys, acme's compiled model, the visuals skill's renders). A preview for
// reading and review, not the site: that is a React site in its own thread. `nx run canon:preview` runs it.
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "./runtime.mjs";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeHighlight from "rehype-highlight";
import hljs from "highlight.js";
import { visit } from "unist-util-visit";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { components as makeComponents } from "./components.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const canon = resolve(here, "..");
const repo = resolve(canon, "../..");
const out = join(canon, ".preview/index.html");
const read = (p) => readFileSync(p, "utf8");
// Links to GitHub name this branch for the canon's own files (they may not be on main yet), and main for the code.
const BRANCH = (() => {
  try { return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(); }
  catch { return "main"; }
})();
const gh = (path, ref = "main") => `https://github.com/Open-Harness/orthograph/blob/${ref}/${path}`;

// ---- the outline: every page, written or not ----
const outline = read(join(canon, "outline.md"));
const parts = [];
for (const block of outline.split(/^## /m).slice(1)) {
  const title = block.split("\n")[0].trim();
  const rows = [...block.matchAll(/^\| (\d+|R\d) \| \*{0,2}`([a-z/-]+)`\*{0,2} \| (.+)$/gm)].map((m) => {
    const cells = m[3].split(" | ").map((c) => c.replace(/\|\s*$/, "").trim());
    return { n: m[1], name: m[2], cells };
  });
  if (rows.length) parts.push({ title, rows });
}
const written = new Set(readdirSync(canon).filter((n) => n.endsWith(".mdx") && !n.startsWith("_")).map((n) => n.replace(".mdx", "")));
const pageNames = new Set(parts.flatMap((p) => p.rows.map((r) => r.name)));
const idOf = (name) => `page-${name.replace(/\//g, "-")}`;

// ---- remark/rehype plugins ----
const fenceMeta = () => (tree) =>
  visit(tree, "code", (node, i, parent) => {
    if (!node.meta || !parent) return;
    parent.children[i] = {
      type: "mdxJsxFlowElement", name: "Fence",
      attributes: [{ type: "mdxJsxAttribute", name: "meta", value: node.meta }, { type: "mdxJsxAttribute", name: "lang", value: node.lang ?? "" }],
      children: [{ ...node, meta: null }],
    };
  });
const FILES = { "README.md": "readme", "outline.md": "outline", "_template.mdx": "template", "components/README.md": "components", "components/types.ts": "types", "check.mjs": "check", "stores.mdx": "stores", "traces.mdx": "traces" };
const PATH = /^(?:[\w@.-]+\/)+[\w@.-]*\.\w+(?::(\d+)(?:-(\d+))?)?$/;
const links = (base) => () => (tree) =>
  visit(tree, "element", (node, i, parent) => {
    if (node.tagName === "a" && node.properties?.href) {
      const href = String(node.properties.href).replace(/^\.\//, "");
      const key = base ? `${base}/${href}`.replace(/^components\/\.\.\//, "") : href;
      const page = /^([a-z-]+)\.mdx(#.*)?$/.exec(href)?.[1];
      const target = FILES[key] ?? FILES[href] ?? (pageNames.has(page) ? page : undefined);
      if (target) node.properties.href = `#${idOf(target)}`;
      return;
    }
    if (node.tagName !== "code" || parent?.tagName === "pre" || parent?.tagName === "a") return;
    const text = node.children?.[0]?.value ?? "";
    let href;
    if (pageNames.has(text)) href = `#${idOf(text)}`;
    else if (PATH.test(text) && !/^(generated|blueprint)\//.test(text)) {
      const [path, a, b] = [text.replace(/:.*$/, ""), ...(/:(\d+)(?:-(\d+))?$/.exec(text)?.slice(1) ?? [])];
      if (existsSync(join(repo, path))) href = gh(path, path.startsWith("docs/canon") ? BRANCH : "main") + (a ? `#L${a}${b ? `-L${b}` : ""}` : "");
    }
    if (href) parent.children[i] = { type: "element", tagName: "a", properties: { href, className: ["ref"] }, children: [node] };
  });

const frontmatterOf = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const out = {};
  if (!m) return out;
  let list;
  for (const raw of m[1].split("\n")) {
    if (/^\s*#/.test(raw) || !raw.trim()) continue;
    const item = /^\s+- (.*)$/.exec(raw);
    if (item && list) { list.push(item[1]); continue; }
    const kv = /^([a-z]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    if (kv[2] === "") { list = out[kv[1]] = []; continue; }
    list = undefined;
    out[kv[1]] = kv[2].startsWith("[") ? kv[2].slice(1, -1).split(",").map((s) => s.trim()) : kv[2];
  }
  return out;
};

const C = makeComponents({ repo, gh, idOf, read, pageNames });
const render = async (source, { format, fm, base }) => {
  const { default: Content } = await evaluate(source, {
    ...runtime, format, development: false,
    remarkPlugins: [remarkGfm, remarkFrontmatter, fenceMeta],
    rehypePlugins: [[rehypeHighlight, { detect: false, ignoreMissing: true, aliases: { typescript: ["ts"] } }], links(base)],
  });
  return runtime.render(runtime.jsx(Content, { components: { ...C.components, Status: () => C.status(fm) } }));
};
const source = (path, lang) => `<pre class="hljs-pre"><code class="hljs">${hljs.highlight(read(join(canon, path)), { language: lang }).value}</code></pre>`;

// ---- pages ----
const pages = [];
const add = (name, title, group, html, extra = "") => pages.push({ name, title, group, html, extra });

add("readme", "The canon", "Start", await render(read(join(canon, "README.md")), { format: "md", fm: {} }));
add("outline", "Outline", "Start", await render(read(join(canon, "outline.md")), { format: "md", fm: {} }));
for (const part of parts) {
  for (const r of part.rows) {
    if (written.has(r.name)) {
      const text = read(join(canon, `${r.name}.mdx`));
      const fm = frontmatterOf(text);
      add(r.name, fm.title, part.title, C.header(fm, r.name) + (await render(text, { format: "mdx", fm })), "written");
    } else add(r.name, r.name, part.title, C.stub(r, part.title), "pending");
  }
}
const check = (() => {
  try { return execFileSync("node", [join(canon, "check.mjs")], { encoding: "utf8" }); }
  catch (e) { return `${e.stdout}${e.stderr}`; }
})();
add("template", "The template", "Writing pages", `<h1>The template</h1><p class="lede">Every page copies this file and keeps its eight sections, in order. The comments are the instructions; they vanish when rendered, so here it is as source.</p>${source("_template.mdx", "markdown")}`);
add("components", "Components", "Writing pages", await render(read(join(canon, "components/README.md")), { format: "md", fm: {}, base: "components" }));
add("gallery", "Components, live", "Writing pages", `<h1>Components, live</h1><p class="lede">Each component rendered from real data: the journey file, acme's compiled model, the visuals skill's renders, and a decision record.</p>` + (await render(C.gallery, { format: "mdx", fm: { status: "specified", milestone: "M1", slices: ["M1.17"], decisions: ["K3"] } })));
add("types", "Prop types", "Writing pages", `<h1>components/types.ts</h1><p class="lede">The props, and nothing else yet.</p>${source("components/types.ts", "typescript")}`);
add("check", "The check", "Writing pages", `<h1>The check</h1><p class="lede">Run just now against this checkout:</p><pre class="check">${C.esc(check)}</pre><p class="lede"><code>docs/canon/check.mjs</code>:</p>${source("check.mjs", "javascript")}`);

const groups = [...new Set(pages.map((p) => p.group))];
const nav = groups.map((g) => `<div class="group"><div class="gtitle">${C.esc(g)}</div>${pages.filter((p) => p.group === g).map((p) =>
  `<a href="#${idOf(p.name)}" class="nav ${p.extra}" data-page="${idOf(p.name)}">${C.esc(p.title)}${p.extra === "pending" ? '<span class="pass">pass 2</span>' : ""}</a>`).join("")}</div>`).join("");
const sections = pages.map((p) => `<section id="${idOf(p.name)}" class="page" hidden>${p.html}</section>`).join("\n");
const hl = (f) => read(createRequire(import.meta.url).resolve(`highlight.js/styles/${f}`));
const html = read(join(here, "shell.html"))
  .replace("/*HLJS*/", `${hl("github.css")}\n@media (prefers-color-scheme: dark){${hl("github-dark.css")}}`)
  .replace("<!--NAV-->", nav).replace("<!--PAGES-->", sections).replace("/*SCENES*/", C.sceneData());
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`canon preview: ${pages.length} pages, ${(html.length / 1e6).toFixed(1)} MB, open ${out}`);
