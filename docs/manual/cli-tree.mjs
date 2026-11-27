// Records the command line's own tree, by asking it: node docs/manual/cli-tree.mjs > docs/manual/captures/cli.json
// Each command's subcommands, flags (with the choices a flag allows) and arguments are read from its --help. check.mjs holds
// every `ortho …` the manual writes against this file, so a flag is tested on the command it is written with. Needs Node 24.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const main = resolve(import.meta.dirname, "../../packages/cli/src/main.ts");
const help = (path) => spawnSync(process.execPath, [main, ...path, "--help"], { encoding: "utf8" }).stdout;
const section = (text, name) => { const m = new RegExp(`^${name}\\n((?:  .*\\n?)+)`, "m").exec(text); return m ? m[1].split("\n").filter(Boolean) : []; };
function read(path) {
  const text = help(path), flags = {};
  for (const row of section(text, "FLAGS")) { const m = /^  --([a-z-]+)( \w+)?/.exec(row), choices = /\(choices: ([^)]+)\)/.exec(row); if (m) flags[m[1]] = choices ? choices[1].split(", ") : m[2] ? "value" : "switch"; }
  const subcommands = {};
  for (const row of section(text, "SUBCOMMANDS")) { const names = /^  ([a-z, -]+?)   /.exec(row)?.[1].split(", ") ?? []; if (!names.length) continue; const tree = read([...path, names[0]]); for (const n of names) subcommands[n] = tree; }
  return { arguments: section(text, "ARGUMENTS").map((row) => row.trim().split(" ")[0]), flags, subcommands };
}
process.stdout.write(JSON.stringify(read([]), null, 1) + "\n");
