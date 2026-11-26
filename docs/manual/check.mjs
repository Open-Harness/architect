// Keeps the manual and the agent kit true to each other, to the command line and to what was recorded: node docs/manual/check.mjs
// 1. Each role's limits are written once, in kit/roles.json. The role table in working-with-your-agents.md and in kit/AGENTS.md,
//    and the three opening lines of each skill, must say the same words.
// 2. Every `ortho <command>` named in the manual or the kit is a command the CLI has, with its subcommand and its flags, and is
//    written with the argument it needs.
// 3. A chapter types nothing it could read. Every fenced block in chapters/ is a quote: `capture=<file>` (each line is a line of
//    that recording in captures/, in order, and a `$` line is the command the recording ran) or `file=<path> lines=a-b` (those
//    lines of that file, exactly). A line that ends " …" matches a recorded line that starts the same way.
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

// The CLI's own commands, subcommands and flags, read from where they are declared.
const main = read(join(repo, "packages/cli/src/main.ts"));
const commands = new Set([...main.matchAll(/(?:Command\.make|addOne|addPlugin|environment)\(\s*"([a-z-]+)"/g)].map((m) => m[1]));
const flags = new Set([...main.matchAll(/Flag\.\w+\(\s*"([a-z-]+)"/g)].map((m) => m[1]).concat(["help", "version"]));
const groups = new Set([...main.matchAll(/Command\.make\("([a-z-]+)"\)\.pipe\([^\n]*withSubcommands/g)].map((m) => m[1]).concat(["secrets"]));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const pages = walk(here).filter((f) => f.endsWith(".md")), short = (f) => f.slice(repo.length + 1);
let named = 0;
for (const file of pages) {
  for (const m of read(file).matchAll(/(?:`|^\$ )ortho ([a-z-]+)((?: +(?:[a-z-]+|--[a-z-]+|"[^"`\n]*"|<[^>`\n]*>|[\w.]+))*)/gm)) {
    named++;
    const [, command, rest] = m, words = rest.trim().split(/ +/).filter(Boolean);
    if (!commands.has(command)) { problems.push(`${short(file)}: \`ortho ${command}\` is not a command in packages/cli/src/main.ts`); continue; }
    if (groups.has(command) && /^[a-z-]+$/.test(words[0] ?? "") && !commands.has(words[0])) problems.push(`${short(file)}: \`ortho ${command} ${words[0]}\` is not a subcommand in packages/cli/src/main.ts`);
    // An add command is written with what it adds: a name, a "quoted name" or a <placeholder>. (`ortho brief` alone names the command.)
    const needs = command === "add" && commands.has(words[0]) ? 2 : 0, given = words.filter((w) => !w.startsWith("--"));
    if (needs && given.length < needs) problems.push(`${short(file)}: \`ortho ${command}${rest}\` is written without the argument it needs`);
    const only = words.indexOf("--only"); if (only >= 0 && !/^["<]/.test(words[only + 1] ?? "")) problems.push(`${short(file)}: \`ortho ${command}${rest}\` gives --only no journey name: it takes the name a journey declares, in quotes`);
    for (const w of words) if (w.startsWith("--") && !flags.has(w.slice(2))) problems.push(`${short(file)}: \`ortho ${command}\` is written with ${w}, which is not a flag in packages/cli/src/main.ts`);
  }
}

// The chapters: every fenced block is a quote of a recording or of a file, and each has the four parts.
const parts = ["What you do", "What your agent does", "What you read", "What goes wrong"];
const chapters = existsSync(join(here, "chapters")) ? readdirSync(join(here, "chapters")).filter((f) => f.endsWith(".md")).sort() : [];
let quotes = 0;
for (const name of chapters) {
  const file = join(here, "chapters", name), text = read(file), at = `chapters/${name}`, say = (what) => problems.push(`${at}: ${what}`);
  const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (heads.join(" | ") !== parts.join(" | ")) say(`its parts are "${heads.join('", "')}", and a chapter has exactly "${parts.join('", "')}"`);
  if (!/^\*\*How it stands\.\*\* /m.test(text)) say("it does not say how it stands");
  const film = /^Film: `(docs\/explainer\/films\/[a-z-]+)\/`/m.exec(text);
  if (!film) say("it names no film"); else if (!existsSync(join(repo, film[1], "script.json"))) say(`its film ${film[1]} has no script.json`);
  for (const m of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) if (!/^[a-z]+:/.test(m[1]) && !existsSync(resolve(dirname(file), m[1]))) say(`the link ${m[1]} leads nowhere`);
  for (const m of text.matchAll(/^```(\S*)([^\n]*)\n([\s\S]*?)\n```$/gm)) {
    quotes++;
    const [, , info, body] = m, rows = body.split("\n"), capture = /capture=(\S+)/.exec(info), source = /file=(\S+) lines=(\d+)-(\d+)/.exec(info);
    if (capture) {
      const path = join(here, "captures", capture[1]);
      if (!existsSync(path)) { say(`quotes captures/${capture[1]}, which was not recorded`); continue; }
      const recorded = read(path).split("\n"); let from = 0;
      for (const row of rows) {
        if (row.startsWith("$ ") && row !== recorded[0]) { say(`says captures/${capture[1]} ran\n    ${row}\n  and it ran\n    ${recorded[0]}`); continue; }
        const cut = row.endsWith(" …") ? row.slice(0, -2) : undefined;
        const found = recorded.findIndex((r, k) => k >= from && (cut === undefined ? r === row : r.startsWith(cut)));
        if (found < 0) say(`quotes a line that is not in captures/${capture[1]} (or is out of order):\n    ${row}`); else from = found + 1;
      }
    } else if (source) {
      const path = join(repo, source[1]);
      if (!existsSync(path)) { say(`quotes ${source[1]}, which is not there`); continue; }
      const real = read(path).split("\n").slice(+source[2] - 1, +source[3]).join("\n");
      if (real !== body) say(`its quote of ${source[1]} lines ${source[2]}-${source[3]} is not what the file says`);
    } else say(`has a fenced block that quotes nothing: give it capture=<file> or file=<path> lines=a-b\n    ${rows[0]}`);
  }
}

if (problems.length) { console.error(problems.join("\n")); console.error(`manual check failed: ${problems.length} problem(s)`); process.exit(1); }
console.log(`manual check passed: ${roles.length} roles agree across the page, the kit's AGENTS.md and ${roles.length} skills; ${named} ortho commands named, each with its subcommand and flags in the CLI; ${chapters.length} chapters, ${quotes} quotes, each found in a recording or a file`);
