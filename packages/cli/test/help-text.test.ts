// Slice 7 of Goal 18 (#1065): every `ortho` command, flag and argument says what it is for in its own `--help`.
// Today `ortho --help` lists the commands with blank descriptions and every flag with only its type.
//
// What is judged comes from `ortho --help` itself, walked down to the leaves (test/help-tree.ts), so a command added later
// is judged too. What keeps that from passing hollow is INVENTORY below: the commands, flags and arguments `src/main.ts`
// declares today, written out here. A command, flag or argument that disappears fails its own test.
// `ortho new app` (slice 6, #1082) is not pinned here, and is not forbidden: when it exists it is judged like the rest.
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

let tree: ReadonlyMap<string, Page>;
beforeAll(async () => {
  tree = await walk();
}, 240_000);

/** A command's row in its parent's SUBCOMMANDS list, which is where a newcomer first reads it. */
const rowIn = (path: string): Row | undefined => {
  const parts = path.split(" ");
  const parent = tree.get(parts.slice(0, -1).join(" "));
  return parent?.subcommands.find((s) => s.names.includes(parts[parts.length - 1] ?? ""));
};
const nameOf = (path: string) => path.split(" ").slice(-1)[0] ?? path;

describe("ortho --help reaches every command", () => {
  it.each(PATHS)("`ortho %s --help` answers with its usage and exits 0", (path) => {
    const page = tree.get(path);
    expect(page, `no help page: \`ortho ${path}\` is not listed under its parent's SUBCOMMANDS`).toBeDefined();
    expect(page?.stdout, `ortho ${path} --help printed: ${page?.stdout}${page?.stderr}`).toContain(`USAGE\n  ortho ${path}`);
    expect(page?.status, page?.stderr).toBe(0);
  });

  it("lists nothing the inventory does not know except new commands that are described (below)", () => {
    const unknown = [...tree.keys()].filter((p) => p !== "" && !PATHS.includes(p));
    // `new app` is the one expected here (slice 6). Any other command is a decision: add it to INVENTORY.
    expect(unknown.filter((p) => p !== "new app")).toEqual([]);
  });
});

describe("every command says what it does", () => {
  it.each(PATHS)("`ortho %s` has a description in its parent's list", (path) => {
    const row = rowIn(path);
    expect(row, `\`ortho ${path}\` is not in its parent's SUBCOMMANDS`).toBeDefined();
    expect(says(row?.text ?? "", nameOf(path)), `the list shows "${row?.left}" with the description: "${row?.text ?? ""}"`).toBe(true);
  });

  it.each(PATHS)("`ortho %s --help` opens with the same description", (path) => {
    const page = tree.get(path);
    expect(says(page?.description ?? "", nameOf(path)), `ortho ${path} --help has no DESCRIPTION, or it says nothing: "${page?.description ?? ""}"`).toBe(true);
    expect(page?.description).toBe(rowIn(path)?.text);
  });

  it("gives no two commands the same description", () => {
    const seen = new Map<string, string>();
    const twins: string[] = [];
    for (const p of [...tree.keys()].filter((k) => k !== "")) {
      const text = rowIn(p)?.text ?? "";
      if (text !== "" && seen.has(text)) twins.push(`ortho ${seen.get(text)} and ortho ${p}: "${text}"`);
      seen.set(text, p);
    }
    expect(twins).toEqual([]);
  });

  it("describes every command found by walking, the ones not in the inventory too", () => {
    const bare = [...tree.keys()].filter((p) => p !== "" && !says(rowIn(p)?.text ?? "", nameOf(p)));
    expect(bare.map((p) => `ortho ${p}`)).toEqual([]);
  });
});

describe("every flag and argument says what it is for", () => {
  it.each(PATHS)("`ortho %s` declares the flags and arguments it declares today", (path) => {
    const page = tree.get(path);
    const have = (rows: ReadonlyArray<Row> | undefined) => (rows ?? []).flatMap((r) => r.names);
    expect(have(page?.flags), `FLAGS of ortho ${path}`).toEqual(expect.arrayContaining(INVENTORY[path]?.flags.map((f) => `--${f}`) ?? []));
    expect(have(page?.args), `ARGUMENTS of ortho ${path}`).toEqual(expect.arrayContaining(INVENTORY[path]?.args ?? []));
  });

  it.each(PATHS.filter((p) => (INVENTORY[p]?.flags.length ?? 0) + (INVENTORY[p]?.args.length ?? 0) > 0))("`ortho %s` describes each of its flags and arguments", (path) => {
    const page = tree.get(path);
    const rows = [...(page?.flags ?? []), ...(page?.args ?? [])];
    const bare = rows.filter((r) => !says(r.text, r.names[0]?.replace(/^--/, "") ?? "")).map((r) => `${r.left}: "${r.text}"`);
    expect(bare).toEqual([]);
  });

  it.each(PATHS.filter((p) => (INVENTORY[p]?.flags.length ?? 0) > 1))("`ortho %s` gives no two of its flags the same words", (path) => {
    const texts = (tree.get(path)?.flags ?? []).map((r) => r.text).filter((t) => t !== "");
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });

  it("describes every flag and argument found by walking, the ones not in the inventory too", () => {
    const bare = [...tree.values()].flatMap((p) => [...p.flags, ...p.args].filter((r) => !says(r.text, r.names[0]?.replace(/^--/, "") ?? "")).map((r) => `ortho ${p.path.join(" ")} ${r.left}`));
    expect(bare).toEqual([]);
  });
});
