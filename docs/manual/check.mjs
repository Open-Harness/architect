// Keeps the manual and the agent kit true to each other, to the command line and to what was recorded: node docs/manual/check.mjs
// 1. Each role's limits are written once, in kit/roles.json. The role table in working-with-your-agents.md and in kit/AGENTS.md,
//    and the three opening lines of each skill, must say the same words.
// 2. Every `ortho …` written in the manual or the kit is held against the command line's own tree (captures/cli.json, recorded
//    from --help): the subcommand exists under that command, each flag is a flag of that command, a flag with choices is given
//    one of them, and an add command or a `$` line has the argument it needs.
// 3. A chapter types nothing it could read. Every fenced block in chapters/ is a quote: `capture=<file>` (each line is a line of
//    that recording in captures/, in order; it opens with the `$` command the recording ran, unless the block is marked `part`)
//    or `file=<path> lines=a-b` (those lines of that file, exactly). A line that ends " …" matches a recorded line that starts
//    the same way. Output written in a sentence, in backticks with ✔ or ✘, must be in a recording too.
//    What it cannot know: whether the lines a quote leaves out change its meaning, or whether a number in a sentence is right.
//    Those are a reviewer's.
// 4. A chapter has the four parts and nothing else, says how it stands, names a film that exists, and its links resolve.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const here = import.meta.dirname, repo = resolve(here, "../..");
const read = (p) => readFileSync(p, "utf8");
const problems = [];
const { roles } = JSON.parse(read(join(here, "kit/roles.json")));

for (const page of ["working-with-your-agents.md", "kit/AGENTS.md"]) {
  const text = read(join(here, page));
  for (const r of roles) {
    const row = `| ${r.role} | ${r.touches} | ${r.given} | ${r.checked} |`;
    if (!text.includes(row)) problems.push(`${page}: the row for the ${r.role} is not what kit/roles.json says:\n    ${row}`);
  }
}
for (const r of roles) {
  const file = `kit/skills/${r.role}/SKILL.md`, text = read(join(here, file));
  for (const line of [`**May touch:** ${r.touches}.`, `**Is given:** ${r.given}.`, `**Is checked by:** ${r.checked}.`]) {
    if (!text.includes(line)) problems.push(`${file}: missing the line\n    ${line}`);
  }
  if (!new RegExp(`^name: ${r.role}$`, "m").test(text)) problems.push(`${file}: its name is not ${r.role}`);
}

// The command line's own tree, as captures/cli.json recorded it from --help. A command the tree has must still be declared.
const tree = JSON.parse(read(join(here, "captures/cli.json"))), main = read(join(repo, "packages/cli/src/main.ts"));
for (const name of Object.keys(tree.subcommands)) if (!main.includes(`"${name}"`)) problems.push(`captures/cli.json: the command ${name} is no longer in packages/cli/src/main.ts: record again with docs/manual/capture.sh cli`);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const pages = walk(here).filter((f) => f.endsWith(".md")), short = (f) => f.slice(repo.length + 1);
let named = 0;
/** One written command, held against the tree: its subcommand, each flag on that command, a flag's choices, and its arguments. */
function command(file, text) {
  named++;
  const words = text.match(/"[^"]*"|\S+/g).slice(1), say = (what) => problems.push(`${short(file)}: \`${text}\` ${what}`);
  let at = tree, name = "ortho", given = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.startsWith("--")) {
      const kind = at.flags[w.slice(2)];
      if (kind === undefined && !["--help", "--version"].includes(w)) { say(`is written with ${w}, which is not a flag of ${name}`); continue; }
      if (kind === "switch" || kind === undefined) continue;
      const value = words[++i];
      if (value === undefined || value.startsWith("-")) say(`gives ${w} no value`);
      else if (w === "--only" && !/^["<]/.test(value)) say("gives --only a bare word: it takes the name a journey declares, in quotes");
      else if (Array.isArray(kind) && !/^</.test(value) && !kind.includes(value)) say(`gives ${w} the value ${value}, and it takes ${kind.join(", ")}`);
    } else if (w.startsWith("-")) say(`is written with ${w}, which is not a flag of ${name}`);
    else if (Object.keys(at.subcommands).length && given === 0 && at.subcommands[w]) { at = at.subcommands[w]; name += " " + w; }
    else if (Object.keys(at.subcommands).length && at.arguments.length === 0) { say(`names ${w}, which is not a subcommand of ${name}`); return; }
    else if (++given > at.arguments.length) say(`gives ${name} more than it takes`);
  }
  // A whole command line, in a block or after `$`, is written with its arguments. In prose `ortho brief` alone names the command.
  return { at, name, given };
}
for (const file of pages) {
  const text = read(file);
  for (const m of text.matchAll(/`(ortho(?: [^`\n]*)?)`/g)) {
    const got = command(file, m[1]);
    if (got && got.name.startsWith("ortho add ") && got.given < got.at.arguments.length) problems.push(`${short(file)}: \`${m[1]}\` is written without what it adds`);
    if (got && got.at === tree && m[1] !== "ortho") { /* a bare `ortho <word>` that is no command was already reported */ }
  }
  for (const m of text.matchAll(/^\$ (ortho [^\n]*)$/gm)) { const got = command(file, m[1]); if (got && got.given < got.at.arguments.length) problems.push(`${short(file)}: \`${m[1]}\` is run without the argument ${got.name} needs`); }
}

// The chapters: every block is a quote of a recording or of a file, and each has the four parts.
const parts = ["What you do", "What your agent does", "What you read", "What goes wrong"];
const chapters = existsSync(join(here, "chapters")) ? readdirSync(join(here, "chapters")).filter((f) => f.endsWith(".md")).sort() : [];
const recordings = readdirSync(join(here, "captures")).filter((f) => f.endsWith(".txt")).map((f) => read(join(here, "captures", f)));
const slug = (heading) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/ /g, "-");
let quotes = 0;
for (const name of chapters) {
  const file = join(here, "chapters", name), text = read(file), at = `chapters/${name}`, say = (what) => problems.push(`${at}: ${what}`);
  const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (heads.join(" | ") !== parts.join(" | ")) say(`its parts are "${heads.join('", "')}", and a chapter has exactly "${parts.join('", "')}"`);
  if (!/^\*\*How it stands\.\*\* /m.test(text)) say("it does not say how it stands");
  const film = /^Film: `(docs\/explainer\/films\/[a-z-]+)\/`/m.exec(text);
  if (!film) say("it names no film"); else if (!existsSync(join(repo, film[1], "script.json"))) say(`its film ${film[1]} has no script.json`);
  for (const m of text.matchAll(/\]\(([^)#]+)(?:#([^)]*))?\)/g)) {
    const to = resolve(dirname(file), m[1]);
    if (/^[a-z]+:/.test(m[1])) continue;
    if (!existsSync(to)) say(`the link ${m[1]} leads nowhere`);
    else if (m[2] && ![...read(to).matchAll(/^#+ (.+)$/gm)].some((h) => slug(h[1]) === m[2])) say(`the link ${m[1]}#${m[2]} names a heading that page does not have`);
  }
  // Code a chapter shows is always a fence that starts its line: no fence set in from the margin, no ~~~, no indented block.
  const rows = text.split("\n"); let open = false;
  rows.forEach((row, k) => {
    if (/^```/.test(row)) { open = !open; return; }
    if (open) return;
    if (/^\s+```|^\s*~~~/.test(row)) say(`line ${k + 1}: a fence must be \`\`\` at the start of its line, so the check can read it`);
    if (/^ {4,}\S/.test(row) && !/^\s*([-*]|\d+\.) /.test(rows[k - 1] ?? "") && (rows[k - 1] ?? "").trim() === "") say(`line ${k + 1}: an indented block is code the check cannot read: quote it in a fence`);
    // Output written in a sentence is held to the recordings too: anything in backticks with a verdict mark is a line of one.
    for (const m of row.matchAll(/`([^`]*[✔✘][^`]*)`/g)) if (!recordings.some((r) => r.includes(m[1]))) say(`line ${k + 1}: \`${m[1]}\` is in no recording`);
  });
  for (const m of text.matchAll(/^```(\S*)([^\n]*)\n([\s\S]*?)\n```$/gm)) {
    quotes++;
    const [, , info, body] = m, lines = body.split("\n"), capture = /capture=(\S+)/.exec(info), source = /file=(\S+) lines=(\d+)-(\d+)/.exec(info);
    if (capture) {
      if (!/^[\w.-]+\.txt$/.test(capture[1]) || !existsSync(join(here, "captures", capture[1]))) { say(`quotes captures/${capture[1]}, which is not a recording`); continue; }
      const recorded = read(join(here, "captures", capture[1])).split("\n"); let from = 0;
      if (!lines.some((l) => l.startsWith("$ ")) && !/\bpart\b/.test(info)) say(`its quote of captures/${capture[1]} does not open with the command that was run: add the \`$\` line, or mark the block \`part\``);
      for (const row of lines) {
        if (row.startsWith("$ ") && row !== recorded[0]) { say(`says captures/${capture[1]} ran\n    ${row}\n  and it ran\n    ${recorded[0]}`); continue; }
        const cut = row.endsWith(" …") ? row.slice(0, -2) : undefined;
        if (cut !== undefined && cut.trim().length < 12) { say(`quotes a line cut too short to mean anything:\n    ${row}`); continue; }
        if (row.trim() === "…" || row.trim() === "") { say(`its quote of captures/${capture[1]} has a row that quotes nothing`); continue; }
        const found = recorded.findIndex((r, k) => k >= from && (cut === undefined ? r === row : r.startsWith(cut)));
        if (found < 0) say(`quotes a line that is not in captures/${capture[1]} (or is out of order):\n    ${row}`); else from = found + 1;
      }
    } else if (source) {
      const path = resolve(repo, source[1]);
      if (!path.startsWith(repo + "/") || !existsSync(path) || path.startsWith(here + "/chapters")) { say(`quotes ${source[1]}, which is not a file it may quote`); continue; }
      const real = read(path).split("\n").slice(+source[2] - 1, +source[3]).join("\n");
      if (real !== body) say(`its quote of ${source[1]} lines ${source[2]}-${source[3]} is not what the file says`);
    } else say(`has a fenced block that quotes nothing: give it capture=<file> or file=<path> lines=a-b\n    ${lines[0]}`);
  }
}

if (problems.length) { console.error(problems.join("\n")); console.error(`manual check failed: ${problems.length} problem(s)`); process.exit(1); }
console.log(`manual check passed: ${roles.length} roles agree across the page, the kit's AGENTS.md and ${roles.length} skills; ${named} ortho commands written, each held against the command line's own tree; ${chapters.length} chapters, ${quotes} quotes, each found in a recording or a file`);
