// Walks `ortho --help` the way a person would: the root's help, then each subcommand's, down to the leaves. The tests in
// help-text.test.ts and getting-started.test.ts judge what it finds. Slice 7 of Goal 18 (#1065).
// Not a test file. It runs the real entry (src/main.ts) as a child process, so what is judged is what `ortho` prints.
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
/** Without colour: CI sets FORCE_COLOR, which wraps words in ANSI codes. */
const plain = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" };

/** One row of a help section: `--env choice    Which environment…` is { left: "--env choice", text: "Which environment…" }. */
export interface Row {
  readonly left: string;
  /** The words after the gap, with the parser's own "(choices: …)" tail taken off: only what the author wrote. */
  readonly text: string;
  /** The row's names: `model, describe` is ["model", "describe"]; `--env choice` is ["--env"]; `name string` is ["name"]. */
  readonly names: ReadonlyArray<string>;
}

export interface Page {
  readonly path: ReadonlyArray<string>;
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** The text of the DESCRIPTION section: what this command says about itself, `""` when it has none. */
  readonly description: string;
  readonly subcommands: ReadonlyArray<Row>;
  readonly flags: ReadonlyArray<Row>;
  readonly args: ReadonlyArray<Row>;
}

const run = (args: ReadonlyArray<string>) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn("node", [resolve(root, "src/main.ts"), ...args], { cwd: root, env: plain });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("close", (status) => done({ status, stdout, stderr }));
  });

const tail = /\s*\((?:choices|default)[^)]*\)\s*$/;

const rowOf = (line: string, section: string): Row | undefined => {
  const m = /^ {2}(\S.*?)(?: {2,}(.*))?$/.exec(line.trimEnd());
  if (!m) return undefined;
  const left = m[1] ?? "";
  const names = section === "SUBCOMMANDS" ? left.split(",").map((n) => n.trim()) : [left.split(/\s+/)[0] ?? left];
  return { left, text: (m[2] ?? "").replace(tail, "").trim(), names };
};

/** The sections of a help page: a line of capitals opens one, and the indented lines under it belong to it. */
const sectionsOf = (stdout: string): ReadonlyMap<string, ReadonlyArray<string>> => {
  const out = new Map<string, string[]>();
  let open: string[] | undefined;
  for (const line of stdout.split("\n")) {
    if (/^[A-Z][A-Z ]+$/.test(line)) out.set(line, (open = []));
    else if (open && line.trim() !== "") open.push(line);
  }
  return out;
};

export const helpOf = async (path: ReadonlyArray<string>): Promise<Page> => {
  const ran = await run([...path, "--help"]);
  const sections = sectionsOf(ran.stdout);
  const rows = (name: string) => (sections.get(name) ?? []).flatMap((l) => rowOf(l, name) ?? []);
  return {
    path,
    ...ran,
    description: (sections.get("DESCRIPTION") ?? []).map((l) => l.trim()).join(" "),
    subcommands: rows("SUBCOMMANDS"),
    flags: rows("FLAGS"),
    args: rows("ARGUMENTS"),
  };
};

/** Every command reachable from the root by `--help`, the root first, keyed by its path joined with spaces ("env up"). */
export const walk = async (): Promise<ReadonlyMap<string, Page>> => {
  const found = new Map<string, Page>();
  let wave: ReadonlyArray<ReadonlyArray<string>> = [[]];
  while (wave.length > 0) {
    const pages = await Promise.all(wave.map(helpOf));
    for (const p of pages) found.set(p.path.join(" "), p);
    wave = pages.flatMap((p) => p.subcommands.map((s) => [...p.path, s.names[0] ?? ""]));
  }
  return found;
};

const filler = new Set(["the", "a", "an", "of", "to", "for", "and", "or", "is", "it", "this", "that", "flag", "option", "command", "argument", "value", "string", "integer", "choice"]);

/** Whether a description says something: enough words, and at least one that isn't the name, the type or filler. */
export const says = (text: string, name: string): boolean => {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "");
  const named = new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== ""));
  return text.length >= 12 && words.length >= 3 && words.some((w) => !filler.has(w) && !named.has(w));
};
