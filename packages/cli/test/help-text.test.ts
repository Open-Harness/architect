// Slice 7 of Goal 18 (#1065): every `ortho` command, flag and argument says what it is for in its own `--help`.
// Today `ortho --help` lists the commands with blank descriptions and every flag with only its type, and
// `ortho secrets set --help` is refused before the parser sees it.
//
// What is judged is the command tree as src/main.ts declares it, read from the CLI's own help data (test/help-tree.ts,
// test/help-doc.hook.ts), walked down to the leaves, so a command added later is judged too; and the page a person reads,
// printed without colour, must show each description found. What keeps the walk from passing hollow (a command or flag
// dropped to have one less to describe) is INVENTORY below: the commands, flags and arguments main.ts declares on
// 26 November 2026. A command, flag or argument that disappears fails its own test. A new one is not refused: it is
// judged by the "found by walking" tests like the rest (`ortho new app`, slice 6, #1082, among them).
import { beforeAll, describe, expect, it } from "vitest";
import { says, walk, type Page, type Row } from "./help-tree.ts";

/** path -> its flags (without `--`) and its positional arguments, as main.ts declares them on 26 November 2026. */
const INVENTORY: Readonly<Record<string, { readonly flags: ReadonlyArray<string>; readonly args: ReadonlyArray<string> }>> = {
  model: { flags: ["json", "root"], args: [] },
  dev: { flags: ["root", "port"], args: [] },
  prove: { flags: ["env", "root", "port", "empty", "only", "changed", "json", "report", "run"], args: [] },
  promote: { flags: ["to", "root"], args: [] },
  secrets: { flags: ["env", "root"], args: [] },
  "secrets set": { flags: ["env", "root"], args: ["name"] },
  add: { flags: [], args: [] },
  "add thing": { flags: ["dry-run", "root"], args: ["name"] },
  "add operation": { flags: ["dry-run", "root"], args: ["name"] },
  "add read": { flags: ["dry-run", "root"], args: ["name"] },
  "add journey": { flags: ["dry-run", "root"], args: ["name"] },
  "add journeys": { flags: ["root"], args: ["thing"] },
  "add feature": { flags: ["as", "dry-run", "root"], args: ["package"] },
  "add adapter": { flags: ["as", "dry-run", "root"], args: ["package"] },
  "add projection": { flags: ["as", "dry-run", "root"], args: ["package"] },
  new: { flags: [], args: [] },
  "new adapter": { flags: ["from-openapi", "root"], args: ["name"] },
  check: { flags: ["root"], args: [] },
  generate: { flags: ["root"], args: [] },
  brief: { flags: ["root"], args: ["operation"] },
  impact: { flags: ["root"], args: [] },
  version: { flags: ["next", "root"], args: [] },
  publish: { flags: ["dry-run", "local", "root"], args: [] },
  build: { flags: ["root"], args: [] },
  env: { flags: [], args: [] },
  "env up": { flags: ["port", "revision", "plan", "run", "root"], args: ["env"] },
  "env down": { flags: ["port", "revision", "plan", "run", "root"], args: ["env"] },
  "env status": { flags: ["port", "revision", "plan", "run", "root"], args: ["env"] },
  "env destroy": { flags: ["plan", "run", "root"], args: ["env"] },
  worlds: { flags: [], args: [] },
  "worlds reap": { flags: ["root"], args: [] },
  telemetry: { flags: [], args: [] },
  "telemetry trace": { flags: ["env", "root"], args: ["id"] },
  watch: { flags: ["env", "source", "since", "root"], args: [] },
};
const PATHS = Object.keys(INVENTORY);
/** The aliases and the choice flags main.ts declares today: a narrowed choice or a dropped alias is a command that changed. */
const ALIASES: Readonly<Record<string, ReadonlyArray<string>>> = { model: ["describe"] };
const CHOICES: Readonly<Record<string, Readonly<Record<string, ReadonlyArray<string>>>>> = {
  prove: { "--env": ["local", "test", "staging"] },
  promote: { "--to": ["staging", "production"] },
  watch: { "--source": ["file", "axiom"] },
};
const WITH_ROWS = PATHS.filter((p) => (INVENTORY[p]?.flags.length ?? 0) + (INVENTORY[p]?.args.length ?? 0) > 0);

let tree: ReadonlyMap<string, Page>;
beforeAll(async () => {
  tree = await walk();
}, 300_000);

/** A command's entry in its parent's subcommands, which is where a newcomer first reads it. */
const rowIn = (path: string): Row | undefined => {
  const parts = path.split(" ");
  const parent = tree.get(parts.slice(0, -1).join(" "));
  return parent?.subcommands.find((s) => s.names.includes(parts[parts.length - 1] ?? ""));
};
const nameOf = (path: string) => path.split(" ").slice(-1)[0] ?? path;
const bareName = (r: Row) => (r.names[0] ?? "").replace(/^--/, "");
/** A page printed by a formatter wraps and pads: compare its words, not its spacing. */
const flat = (text: string) => text.replace(/\s+/g, " ").trim();
/** Two descriptions are twins when they read the same: case, punctuation and spacing aside ("Checks the blueprint." and "checks the blueprint!"). */
const gist = (text: string, _name: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const commands = () => [...tree.keys()].filter((k) => k !== "");

describe("ortho --help reaches every command", () => {
  it.each(PATHS)("`ortho %s --help` answers with its usage and exits 0", (path) => {
    const page = tree.get(path);
    expect(page, `\`ortho ${path}\` is not listed under its parent's subcommands`).toBeDefined();
    expect(page?.found, `ortho ${path} --help printed no help: ${page?.printed}${page?.stderr}`).toBe(true);
    expect(page?.printed, `ortho ${path} --help printed: ${page?.printed}${page?.stderr}`).toContain(`USAGE\n  ortho ${path}`);
    expect(page?.status, page?.stderr).toBe(0);
  });
});

describe("every command says what it does", () => {
  it.each(PATHS)("`ortho %s` has a description in its parent's list", (path) => {
    const row = rowIn(path);
    expect(row, `\`ortho ${path}\` is not in its parent's subcommands`).toBeDefined();
    expect(says(row?.text ?? "", nameOf(path)), `the list shows \`${nameOf(path)}\` with the description: "${row?.text ?? ""}"`).toBe(true);
    expect(flat(row?.printed ?? ""), `the parent's printed SUBCOMMANDS row for \`${nameOf(path)}\` shows that description`).toContain(flat(row?.text ?? "") || "\u0000");
    expect(row?.names ?? [], "its aliases").toEqual(expect.arrayContaining([...(ALIASES[path] ?? [])]));
  });

  it.each(PATHS)("`ortho %s --help` says what it does on its own page", (path) => {
    const page = tree.get(path);
    expect(says(page?.description ?? "", nameOf(path)), `ortho ${path} --help has no description, or it says nothing: "${page?.description ?? ""}"`).toBe(true);
    expect(flat(page?.printedDescription ?? ""), "the printed page's DESCRIPTION is that description").toBe(flat(page?.description ?? "") || "\u0000");
  });

  it("gives no two commands the same description, in the lists or on their pages, nor two that differ only by case or punctuation", () => {
    const twins = (texts: ReadonlyArray<readonly [string, string]>) => {
      const seen = new Map<string, string>();
      const out: string[] = [];
      for (const [p, text] of texts) {
        const key = gist(text, nameOf(p));
        if (key !== "" && seen.has(key)) out.push(`ortho ${seen.get(key)} and ortho ${p}: "${text}"`);
        seen.set(key, p);
      }
      return out;
    };
    expect(twins(commands().map((p) => [p, rowIn(p)?.text ?? ""] as const))).toEqual([]);
    expect(twins(commands().map((p) => [p, tree.get(p)?.description ?? ""] as const))).toEqual([]);
  });

  it("describes every command found by walking, the ones not in the inventory too", () => {
    const bare = commands().filter((p) => !says(rowIn(p)?.text ?? "", nameOf(p)) || !says(tree.get(p)?.description ?? "", nameOf(p)));
    expect(bare.map((p) => `ortho ${p}`)).toEqual([]);
  });
});

describe("every flag and argument says what it is for", () => {
  it.each(PATHS)("`ortho %s` declares the flags and arguments it declares today", (path) => {
    const page = tree.get(path);
    const have = (rows: ReadonlyArray<Row> | undefined) => (rows ?? []).flatMap((r) => r.names);
    expect(have(page?.flags), `flags of ortho ${path}`).toEqual(expect.arrayContaining(INVENTORY[path]?.flags.map((f) => `--${f}`) ?? []));
    expect(have(page?.args), `arguments of ortho ${path}`).toEqual(expect.arrayContaining([...(INVENTORY[path]?.args ?? [])]));
    for (const [flag, choices] of Object.entries(CHOICES[path] ?? {})) expect(page?.flags.find((f) => f.names.includes(flag))?.choices, `the choices of ortho ${path} ${flag}`).toEqual(choices);
  });

  it.each(WITH_ROWS)("`ortho %s` describes each of its flags and arguments, on the page a person reads", (path) => {
    const page = tree.get(path);
    const rows = [...(page?.flags ?? []), ...(page?.args ?? [])];
    expect(rows.length, `ortho ${path} --help shows no flags or arguments`).toBeGreaterThan(0);
    expect(rows.filter((r) => !says(r.text, bareName(r))).map((r) => `${r.names[0]}: "${r.text}"`)).toEqual([]);
    expect(rows.filter((r) => !flat(r.printed).includes(flat(r.text) || "\u0000")).map((r) => `${r.names[0]}: "${r.text}" is not on its own row of the printed page: "${r.printed}"`)).toEqual([]);
  });

  it.each(WITH_ROWS.filter((p) => (INVENTORY[p]?.flags.length ?? 0) + (INVENTORY[p]?.args.length ?? 0) > 1))("`ortho %s` gives no two of its flags and arguments the same words", (path) => {
    const page = tree.get(path);
    const texts = [...(page?.flags ?? []), ...(page?.args ?? [])].map((r) => gist(r.text, bareName(r))).filter((t) => t !== "");
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });

  it("describes every flag and argument found by walking, the ones not in the inventory too", () => {
    const bare = [...tree.values()].flatMap((p) => [...p.flags, ...p.args].filter((r) => !says(r.text, bareName(r))).map((r) => `ortho ${p.path.join(" ")} ${r.names[0]}`));
    expect(bare).toEqual([]);
  });
});
