// Walks `ortho`'s command tree the way a person would, by `--help`: the root, then each subcommand, down to the leaves.
// The tests in help-text.test.ts and readmes.test.ts judge what it finds. Slice 7 of Goal 18 (#1065).
// Not a test file. It runs the real entry (src/main.ts) as a child process twice per command:
//  - with test/help-doc.hook.ts preloaded, which prints the help's data (`HELPDOC <json>`): the tree as main.ts declares it,
//    so nothing here parses a formatter's columns or colours;
//  - plainly, without colour (FORCE_COLOR=0, NO_COLOR=1), which is what a person reads: the checks ask that each
//    description found in the data is also on that page.
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const hook = resolve(import.meta.dirname, "help-doc.hook.ts");
/** Without colour: CI sets FORCE_COLOR, which wraps words in ANSI codes. */
const plain = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" };

/** One entry of a help page: a subcommand, a flag or an argument, with its names and the words its author gave it. */
export interface Row {
  /** `model` (alias `describe`) is ["model", "describe"]; `--dry-run` is ["--dry-run"]; the argument `name` is ["name"]. */
  readonly names: ReadonlyArray<string>;
  /** The description, with the parser's own "(choices: …)" or "(default: …)" tail taken off: only what the author wrote. */
  readonly text: string;
}

export interface Page {
  readonly path: ReadonlyArray<string>;
  /** The exit and output of `ortho <path> --help` as a person runs it (no hook, no colour). */
  readonly status: number | null;
  readonly printed: string;
  readonly stderr: string;
  /** Whether the hooked run printed the help's data at all (it does not when something refuses `--help` first). */
  readonly found: boolean;
  readonly usage: string;
  /** What this command says about itself on its own page, `""` when nothing. */
  readonly description: string;
  /** Each subcommand as its parent lists it: the short description when it has one, else its description. */
  readonly subcommands: ReadonlyArray<Row>;
  readonly flags: ReadonlyArray<Row>;
  readonly args: ReadonlyArray<Row>;
}

interface Doc {
  readonly usage: string;
  readonly description: string;
  readonly flags: ReadonlyArray<{ readonly name: string; readonly aliases: ReadonlyArray<string>; readonly description: string }>;
  readonly args: ReadonlyArray<{ readonly name: string; readonly description: string }>;
  readonly subcommands: ReadonlyArray<{ readonly name: string; readonly alias?: string; readonly shortDescription?: string; readonly description: string }>;
}

const run = (args: ReadonlyArray<string>) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn("node", [...args], { cwd: root, env: plain });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("close", (status) => done({ status, stdout, stderr }));
  });

const tail = /\s*\((?:choices|default)[^)]*\)\s*$/;
const own = (text: string | undefined): string => (text ?? "").replace(tail, "").trim();

export const helpOf = async (path: ReadonlyArray<string>): Promise<Page> => {
  const entry = resolve(root, "src/main.ts");
  const [data, person] = await Promise.all([run(["--import", hook, entry, ...path, "--help"]), run([entry, ...path, "--help"])]);
  const line = data.stdout.split("\n").find((l) => l.startsWith("HELPDOC "));
  const doc: Doc = line ? (JSON.parse(line.slice("HELPDOC ".length)) as Doc) : { usage: "", description: "", flags: [], args: [], subcommands: [] };
  return {
    path,
    status: person.status,
    printed: person.stdout,
    stderr: person.stderr,
    found: line !== undefined,
    usage: doc.usage,
    description: own(doc.description),
    subcommands: doc.subcommands.map((s) => ({ names: s.alias ? [s.name, s.alias] : [s.name], text: own(s.shortDescription ?? s.description) })),
    flags: doc.flags.map((f) => ({ names: [`--${f.name}`, ...f.aliases.map((a) => (a.length === 1 ? `-${a}` : `--${a}`))], text: own(f.description) })),
    args: doc.args.map((a) => ({ names: [a.name], text: own(a.description) })),
  };
};

/** Every command reachable from the root by `--help`, the root first, keyed by its path joined with spaces ("env up"). */
export const walk = async (): Promise<ReadonlyMap<string, Page>> => {
  const found = new Map<string, Page>();
  let wave: ReadonlyArray<ReadonlyArray<string>> = [[]];
  while (wave.length > 0) {
    const pages: Page[] = [];
    // Six at a time (twelve processes): a whole wave at once starves a small CI runner.
    for (let i = 0; i < wave.length; i += 6) pages.push(...(await Promise.all(wave.slice(i, i + 6).map(helpOf))));
    for (const p of pages) found.set(p.path.join(" "), p);
    wave = pages.flatMap((p) => p.subcommands.map((s) => [...p.path, s.names[0] ?? ""]));
  }
  return found;
};

const filler = new Set(["the", "a", "an", "of", "to", "for", "and", "or", "is", "it", "this", "that", "flag", "option", "command", "subcommand", "argument", "value", "string", "integer", "boolean", "choice", "name", "path", "todo", "tbd", "description", "help"]);

/** Whether a description says something: enough words, and at least two that aren't the thing's own name, its type or filler. */
export const says = (text: string, name: string): boolean => {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "");
  const named = new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== ""));
  const meaning = new Set(words.filter((w) => !filler.has(w) && !named.has(w)));
  return text.length >= 12 && words.length >= 3 && meaning.size >= 2;
};
