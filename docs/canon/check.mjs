// Checks the canon, docs/canon/*.mdx, against the repository, so a page can't drift from the code it explains:
//   1. every page has its frontmatter, and the template's eight sections in order;
//   2. a fence that quotes code (file=… name=<declaration>) matches that declaration, whole or in part (--fix rewrites it
//      from the source); one that quotes a non-code file (lines=a-b) matches those lines; a planned fence names a real slice;
//   3. every inline `path:line` reference opens, and has that line;
//   4. every <Note>, <Scenario>, <Model> and <Scene> points at something that exists;
//   5. no glossary word is owned by two pages, and every page is in the outline;
//   6. no retired word or old name, in the pages, the outline, the status page or the READMEs;
//   7. a refusal quoted in design/portal.md (`HandleNotClaimed HN-900 exit 11`) agrees with the generated errors.ts tables.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODE, locate, repair, sliceLines } from "./quotes.mjs";
import { judgeRefusals, loadRefusals } from "./refusals.mjs";

const canon = dirname(fileURLToPath(import.meta.url));
const repo = resolve(canon, "../..");
const SECTIONS = ["The idea", "The smallest example", "How it works", "Choices", "What it is not", "Where it lives", "Status", "Notes"];
const FIELDS = ["title", "concept", "owns", "questions", "status", "milestone", "slices", "decisions", "links"];
const STATUSES = ["draft", "specified", "proved"];
const NOTE_KINDS = ["question", "decision", "status"];
// The visuals skill's scenes, on spike/visual-content (PR #34). Accepted by name until that branch merges.
const PENDING_SCENES = ["handler-lifecycle", "journey-revoke-then-spend", "trace-waterfall"];
// Written in pieces so this file doesn't trip its own check.
const RETIRED = [
  ["the plugin word that was renamed to feature and adapter", new RegExp(`(?<!agent[ -])\\b${"ki"}${"ts?"}\\b`, "i")],
  ["the old framework name", new RegExp(`${"archi"}${"tect"}`, "i")],
  // Prose says Orthograph and `ortho` (K5, "Names"; K6); the old name stays caught in prose, so it can't creep back.
  ["the framework's name before Orthograph, in prose", new RegExp(`\\b${"For"}${"man"}\\b`), "prose"],
  ["the command before `ortho`, in prose", new RegExp(`\`${"for"}${"man"} (check|prove|dev|watch|telemetry|add|describe|model|generate|promote|new|build)\\b`), "prose"],
];

const fix = process.argv.includes("--fix");
const fixes = [];
const problems = [];
const fail = (file, line, what) => problems.push(`${relative(repo, file)}${line ? `:${line}` : ""}: ${what}`);
const read = (p) => readFileSync(p, "utf8");
const at = (p) => resolve(repo, p);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// A slice is an M id (a milestone's) or an ST id (Stage 1's, rows of its table): both are real rows of design/milestones.md.
const slices = new Set([...read(at("design/milestones.md")).matchAll(/^\| ((?:M|ST)\d+\.\d+)/gm)].map((m) => m[1]));
const decisions = readdirSync(at("design/decisions")).filter((n) => n.endsWith(".md"));
const decisionExists = (id) => decisions.some((n) => n === `${id}.md` || n.startsWith(`${id}-`));
const outline = read(join(canon, "outline.md"));
const outlined = new Set([...outline.matchAll(/^\| \d+ \| \*{0,2}`([a-z-]+)`/gm)].map((m) => m[1]));

/** A tiny reader for the frontmatter's shapes: `key: value`, `key: [a, b]`, and `key:` followed by `  - item` lines. */
const frontmatterOf = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return undefined;
  const out = {};
  let list;
  for (const raw of m[1].split("\n")) {
    if (/^\s*#/.test(raw) || raw.trim() === "") continue;
    const item = /^\s+- (.*)$/.exec(raw);
    if (item && list) { list.push(item[1].trim()); continue; }
    const kv = /^([a-z]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") { list = out[key] = []; continue; }
    list = undefined;
    out[key] = value.startsWith("[") ? value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean) : value.trim();
  }
  return out;
};

/** The text with every JSX comment blanked out, newlines kept, so examples inside comments are never checked. */
const withoutComments = (text) => text.replace(/\{\/\*[\s\S]*?\*\/\}/g, (c) => c.replace(/[^\n]/g, " "));

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/(\w+)=(?:"([^"]*)"|\{([^}]*)\}|([^\s"{}>]+))/g)].map((m) => [m[1], m[2] ?? m[3] ?? m[4]]));

const checkSections = (file, text) => {
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  let from = 0;
  for (const s of SECTIONS) {
    const i = headings.indexOf(s, from);
    if (i === -1) fail(file, 0, `missing or out of order: the "## ${s}" section`);
    else from = i + 1;
  }
};

const checkFrontmatter = (file, fm) => {
  if (!fm) return fail(file, 1, "no frontmatter");
  for (const f of FIELDS) if (fm[f] === undefined) fail(file, 1, `frontmatter has no ${f}`);
  if (fm.status && !STATUSES.includes(fm.status)) fail(file, 1, `status must be one of ${STATUSES.join(", ")}`);
  if (fm.milestone && !/^M\d+$/.test(fm.milestone)) fail(file, 1, `milestone ${fm.milestone} is not M<n>`);
  for (const s of fm.slices ?? []) if (!slices.has(s)) fail(file, 1, `slice ${s} is not in design/milestones.md`);
  for (const d of fm.decisions ?? []) if (!decisionExists(d)) fail(file, 1, `decision ${d} is not in design/decisions/`);
  for (const l of fm.links ?? []) if (!outlined.has(l)) fail(file, 1, `links to ${l}, which is not a page in outline.md`);
};

/** Checks every fence; with `fix`, also returns the edits that rewrite a name-anchored quote from its source. */
const checkFences = (file, text, fix) => {
  const edits = [];
  text.replace(/^( *)```(\w*)([^\n]*)\n([\s\S]*?)^\1```$/gm, (whole, indent, lang, metaRaw, body, index) => {
    const line = lineOf(text, index);
    const meta = attrsOf(metaRaw);
    if (meta.planned) {
      if (!slices.has(meta.planned)) fail(file, line, `planned=${meta.planned} is not a slice in design/milestones.md`);
      return whole;
    }
    if (!meta.file || !(meta.name || meta.lines)) { fail(file, line, "a fence must quote a file (file=… name=<declaration>; non-code files file=… lines=a-b) or be planned=<slice>"); return whole; }
    const source = at(meta.file);
    if (!existsSync(source)) { fail(file, line, `quotes ${meta.file}, which doesn't exist`); return whole; }
    const code = read(source);
    const got = body.replace(/\n$/, "").split("\n").map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l).trim());
    if (!meta.name) {
      if (CODE.test(meta.file)) { fail(file, line, `${meta.file} is code: quote a declaration (name=…), not lines`); return whole; }
      const [a, b = a] = meta.lines.split("-").map(Number);
      const want = code.split("\n").slice(a - 1, b).map((l) => l.trim());
      if (want.length !== got.length || want.some((l, i) => l !== got[i])) {
        const i = Math.max(want.findIndex((l, k) => l !== got[k]), 0);
        fail(file, line + 1 + i, `the quote differs from ${meta.file}:${a + i}: "${(want[i] ?? "").slice(0, 70)}"`);
      }
      return whole;
    }
    if (!CODE.test(meta.file)) { fail(file, line, `${meta.file} is not code, so it has no names: quote it with lines=a-b`); return whole; }
    let found = locate(code, meta.name, got);
    let rewritten = whole;
    if (found.at === undefined) {
      const fixed = fix ? repair(code, meta.name, got) : undefined;
      if (!fixed) { fail(file, line + 1, `the quote differs from ${meta.file} ${meta.name}: ${found.reason}${fix ? " (--fix can't place it as one run of the declaration: redo the quote)" : "; run node docs/canon/check.mjs --fix"}`); return whole; }
      const fresh = sliceLines(code, fixed.from, fixed.to).split("\n").map((l) => (l ? indent + l : l)).join("\n");
      rewritten = `${indent}\`\`\`${lang}${metaRaw}\n${fresh}\n${indent}\`\`\``;
      found = { at: fixed.from, to: fixed.to };
    }
    // The hint, for readers: where the quote sits today. Only --fix writes it.
    const hint = `lines=${found.at}${found.to > found.at ? `-${found.to}` : ""}`;
    if (fix && !new RegExp(` ${hint}(?: |$)`).test(metaRaw)) {
      const head = rewritten.indexOf("\n");
      rewritten = rewritten.slice(0, head).replace(/ lines=\S+/, "") + ` ${hint}` + rewritten.slice(head);
    }
    if (rewritten !== whole) { fixes.push(`${relative(repo, file)}:${line}`); edits.push({ start: index, end: index + whole.length, rewritten }); }
    return whole;
  });
  return edits;
};

const PATH = /^(?:\.{0,2}[\w@.-]+\/)+[\w@.-]*(?::(\d+)(?:-(\d+))?)?$/;
const checkReferences = (file, text) => {
  const prose = text.replace(/^( *)```[\s\S]*?^\1```$/gm, (f) => f.replace(/[^\n]/g, " "));
  const refs = [...prose.matchAll(/`([^`\n]+)`/g)].filter((m) => PATH.test(m[1]));
  const full = refs.map((m) => m[1].replace(/:\d.*$/, "")).filter((p) => existsSync(at(p)));
  // A short reference, such as `service.ts:46`, means the full path on this page that ends with it.
  const short = [...prose.matchAll(/`([\w.-]+\.\w+):(\d+)`/g)];
  for (const m of [...refs, ...short]) {
    const [path, from] = [m[1].replace(/:\d.*$/, ""), Number(/:(\d+)/.exec(m[1])?.[1] ?? m[2] ?? 0)];
    const lineText = prose.split("\n")[lineOf(prose, m.index) - 1];
    if (/planned|<|^(@|generated\/|blueprint\/)/.test(path) || (/planned/.test(lineText) && !from)) continue;
    const resolved = existsSync(at(path)) ? path : full.find((p) => p.endsWith(`/${path}`));
    if (!resolved || !existsSync(at(resolved))) { fail(file, lineOf(prose, m.index), `references ${m[1]}, which doesn't exist`); continue; }
    if (from && statSync(at(resolved)).isFile() && read(at(resolved)).split("\n").length < from)
      fail(file, lineOf(prose, m.index), `references ${m[1]}, past the end of the file`);
  }
};

const checkComponents = (file, text) => {
  const ids = new Set();
  for (const m of text.matchAll(/<(Note|Scenario|Model|Scene|Status)\b([^>]*?)\/?>/g)) {
    const [, name, raw] = m;
    const a = attrsOf(raw);
    const line = lineOf(text, m.index);
    const bad = (what) => fail(file, line, `<${name}>: ${what}`);
    if (a.slice && !slices.has(a.slice)) bad(`slice ${a.slice} is not in design/milestones.md`);
    if (name === "Note") {
      if (!NOTE_KINDS.includes(a.kind)) bad(`kind must be one of ${NOTE_KINDS.join(", ")}`);
      if (a.kind === "question" && (!a.id || ids.has(a.id))) bad("a question needs an id, unique on the page");
      if (a.kind === "question") ids.add(a.id);
      if (a.kind === "decision" && !(a.decision && decisionExists(a.decision))) bad(`decision ${a.decision} is not in design/decisions/`);
    }
    if (name === "Scenario") {
      if (!a.journey || !existsSync(at(a.journey))) { bad(`journey ${a.journey} doesn't exist`); continue; }
      const source = read(at(a.journey));
      if (!source.includes("Blueprint.journey(")) bad(`${a.journey} doesn't declare a journey`);
      if (a.step && !source.includes(JSON.stringify(a.step))) bad(`the journey has no step named "${a.step}"`);
    }
    if (name === "Model") {
      if (!a.project || !existsSync(at(join(a.project, "blueprint")))) bad(`project ${a.project} has no blueprint/`);
      else if (a.thing && !existsSync(at(join(a.project, "blueprint/things", a.thing)))) bad(`no thing ${a.thing} in ${a.project}`);
      else if (a.operation) {
        const model = at(join(a.project, "generated/model/model.json"));
        if (!existsSync(model) || !JSON.parse(read(model)).operations?.[a.operation]) bad(`no operation ${a.operation} in ${a.project}'s model`);
      }
    }
    if (name === "Scene") {
      const merged = existsSync(at(`spikes/visual-content/scenes/${a.name}.js`));
      if (!merged && !PENDING_SCENES.includes(a.name)) bad(`no scene named ${a.name}`);
      if (!a.caption) bad("a scene needs a caption: what the reader should watch for");
    }
  }
};

const checkWords = (file) => {
  const code = !/\.(mdx|md)$/.test(file);
  let fence = false;
  read(file).split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) fence = !fence;
    // A prose-only rule skips code, fences, and a line that names today's spelling on purpose ("today `…`").
    const prose = !code && !fence && !/today `/i.test(line);
    for (const [why, re, only] of RETIRED) if ((only !== "prose" || prose) && re.test(line)) fail(file, i + 1, `${why}: ${line.trim().slice(0, 80)}`);
  });
};

const checkLinks = (file) => {
  for (const m of read(file).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(m[1])) continue;
    if (!existsSync(resolve(dirname(file), m[1]))) fail(file, lineOf(read(file), m.index), `broken link ${m[1]}`);
  }
};

const pages = readdirSync(canon).filter((n) => n.endsWith(".mdx") && !n.startsWith("_"));
const owners = new Map();
for (const name of pages) {
  const file = join(canon, name);
  const text = withoutComments(read(file));
  const fm = frontmatterOf(text);
  if (!outlined.has(name.replace(/\.mdx$/, ""))) fail(file, 0, "this page is not in outline.md");
  checkFrontmatter(file, fm);
  checkSections(file, text);
  const edits = checkFences(file, text, fix);
  // The edits were found in the text without its comments, which has the same length as the page: apply them to the page.
  if (edits.length) writeFileSync(file, edits.reduceRight((page, e) => page.slice(0, e.start) + e.rewritten + page.slice(e.end), read(file)));
  checkReferences(file, text);
  checkComponents(file, text);
  if (!/^## Status\n\n<Status \/>/m.test(text)) fail(file, 0, "the Status section must open with <Status />");
  for (const word of fm?.owns ?? []) {
    if (owners.has(word)) fail(file, 1, `owns "${word}", which ${owners.get(word)} already owns`);
    else owners.set(word, name);
  }
}
checkSections(join(canon, "_template.mdx"), read(join(canon, "_template.mdx")));
const prose = ["README.md", "outline.md", "status.md", "components/README.md", "_template.mdx", "components/types.ts", ...pages];
for (const n of prose) checkWords(join(canon, n));
// The status page (K41) is checked like the README: every link resolves and no retired word appears.
for (const n of ["README.md", "outline.md", "status.md", "components/README.md"]) checkLinks(join(canon, n));

// 7. a refusal's code and exit quoted in design/portal.md match the generated `refusals` tables, where there is one.
const refusals = loadRefusals(repo);
const portal = at("design/portal.md");
let unverified = [];
if (existsSync(portal)) {
  const judged = judgeRefusals(read(portal), refusals);
  for (const w of judged.wrong) fail(portal, w.line, `"${w.quoted}" is not what the generated errors.ts says: ${w.truth}`);
  unverified = judged.unverified;
}

if (fixes.length) console.log(`canon check --fix rewrote ${fixes.length} quote${fixes.length === 1 ? "" : "s"}:\n${fixes.map((f) => `  ${f}`).join("\n")}`);
if (problems.length) {
  console.error(`canon check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`canon check passed: ${pages.length} of ${outlined.size} pages written, every quote, reference and component resolves`);
console.log(`refusals in design/portal.md: ${refusals.size} known from generated errors.ts; ${unverified.length} quoted name${unverified.length === 1 ? "" : "s"} could not be verified${unverified.length ? ` (${unverified.join(", ")})` : ""}`);
