// Keeps the manual and the agent kit true to each other and to the command line: node docs/manual/check.mjs
// 1. Each role's limits are written once, in kit/roles.json. The role table in working-with-your-agents.md and in kit/AGENTS.md,
//    and the three opening lines of each skill, must say the same words.
// 2. Every `ortho <command>` named in the manual or the kit is a command the CLI has.
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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

// The CLI's own commands and subcommands, read from where they are declared.
const main = read(join(repo, "packages/cli/src/main.ts"));
const commands = new Set([...main.matchAll(/Command\.make\(\s*"([a-z-]+)"/g)].map((m) => m[1]));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
for (const file of walk(here).filter((f) => f.endsWith(".md"))) {
  for (const m of read(file).matchAll(/`ortho ([a-z-]+)/g)) {
    if (!commands.has(m[1])) problems.push(`${file.slice(repo.length + 1)}: \`ortho ${m[1]}\` is not a command in packages/cli/src/main.ts`);
  }
}

if (problems.length) { console.error(problems.join("\n")); console.error(`manual check failed: ${problems.length} problem(s)`); process.exit(1); }
console.log(`manual check passed: ${roles.length} roles agree across the page, the kit's AGENTS.md and ${roles.length} skills; every ortho command named exists`);
