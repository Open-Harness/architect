// J1 (#1190, CX-journey-signs, call 5): no key is ever shown. Written by J1's checks author; a builder never edits it.
//
// The journeys of `test/signing/` run here once more, at every log level, with every key prove makes through chain-evm's
// `Keys.generate` caught as it is made. Each key is looked for, in every form it could be written in, in the runs, prove's
// printed lines and structured details (what reaches the logbook), every request the world got, everything printed or
// logged, the process's environment, and every file written meanwhile in the repository, the home folder and the system's
// temporary folder.
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { journeyLines } from "#modules/prove/internal/report.js";
import { signing, wire } from "../../../test/signing/journeys.ts";

const { made, said, ran, world, started, addedGlobals } = signing();

const repo = resolve(import.meta.dirname, "../../../../..");
// Not walked: git's objects and other agents' worktrees, which a run never writes. Everything else is, `node_modules` too.
const SKIP = new Set([".git", "worktrees"]);
/** Where a run could write: the repository, the home folder and every temporary folder. */
const ROOTS = [repo, homedir(), tmpdir(), "/tmp", "/var/tmp", "/dev/shm"];
/** Every file under `root` written since the runs began, up to a few megabytes each. */
const writtenSince = (root: string, since: number): ReadonlyArray<string> => {
  const out: Array<string> = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 12) return;
    let entries: ReadonlyArray<string> = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (SKIP.has(name)) continue;
      const path = join(dir, name);
      let stat;
      try { stat = lstatSync(path); } catch { continue; }
      if (stat.isDirectory()) walk(path, depth + 1);
      else if (stat.isFile() && stat.mtimeMs >= since && stat.size < 8_000_000) out.push(path);
    }
  };
  walk(root, 0);
  return out;
};
/**
 * The ways a key could be written: its hex with or without `0x`, any case; its bytes in base64 and base64url, and as a list
 * of numbers (a Buffer or Uint8Array in JSON); and as a decimal number.
 */
const formsOf = (secret: Redacted.Redacted<string>) => {
  const hex = Redacted.value(secret).replace(/^0x/, "").toLowerCase();
  const bytes = Buffer.from(hex, "hex");
  return [hex, bytes.toString("base64").replace(/=+$/, ""), bytes.toString("base64url"), [...bytes].join(","), BigInt(`0x${hex}`).toString()];
};
/**
 * Every text a value holds, however deep: strings, numbers and bigints as text, bytes as hex and as a list of numbers, and a
 * `Redacted` opened, since one kept where it should not be is a key kept.
 */
const textsIn = (value: unknown, seen = new Set<unknown>()): ReadonlyArray<string> => {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "bigint") return [value.toString()];
  if (typeof value !== "object" || value === null || seen.has(value)) return [];
  seen.add(value);
  if (Redacted.isRedacted(value)) return textsIn(Redacted.value(value), seen);
  if (value instanceof Uint8Array) return [Buffer.from(value).toString("hex"), [...value].join(",")];
  const inner = value instanceof Map ? [...value.entries()] : value instanceof Set ? [...value] : Reflect.ownKeys(value).map((k) => (value as Record<string | symbol, unknown>)[k]);
  return inner.flatMap((v) => textsIn(v, seen));
};
const holds = (text: string, forms: ReadonlyArray<string>) => forms.some((form) => text.toLowerCase().includes(form.toLowerCase()));
/** The forms of every key made, once the runs are done; there must be keys to look for, or every check below is hollow. */
const keys = async () => {
  await ran();
  expect(made.length, "keys made with Keys.generate during the runs").toBeGreaterThan(0);
  return made.flatMap(formsOf);
};

describe("no key is ever shown (CX-journey-signs, call 5)", () => {
  it("prove made a key for each person who signed", async () => {
    await ran();
    // ada and bo in two journeys of the first kind, bo in the second, ada in the third and in the claimed world: seven at least.
    expect(made.length, "keys made with Keys.generate during the runs").toBeGreaterThanOrEqual(7);
  });

  it("no key is anywhere in a run (Redacted or bytes too), prove's printed lines, its structured details, or any request the world got, headers too", async () => {
    const forms = await keys();
    const all = await ran();
    const printed = journeyLines(all, new Map());
    const texts = [JSON.stringify(all, wire), ...textsIn(all), printed.lines.join("\n"), ...textsIn(printed.details), ...world().requests.map((r) => `${r.path} ${r.headers} ${r.body}`)];
    expect(texts.filter((t) => holds(t, forms)).map((t) => t.slice(0, 120)), "texts that hold a key").toEqual([]);
    // A key is 64 hex digits; nothing in a run is that long but a signature (130) and nothing that short is a key's (traces are 32).
    expect([JSON.stringify(all, wire), printed.lines.join("\n")].flatMap((t) => t.match(/(?<![0-9a-fA-F])(0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/g) ?? []), "runs of exactly 64 hex digits").toEqual([]);
  });

  it("no key was printed or logged, at any log level", async () => {
    const forms = await keys();
    expect(said.filter((t) => holds(t, forms)).map((t) => t.slice(0, 120)), "lines printed or logged that hold a key").toEqual([]);
  });

  it("no key is in the process's environment, where a child process would inherit it, nor on anything the runs left on globalThis", async () => {
    const forms = await keys();
    expect(Object.entries(process.env).filter(([, v]) => v !== undefined && holds(v, forms)).map(([k]) => k), "variables that hold a key").toEqual([]);
    expect(addedGlobals().flatMap((v) => textsIn(v)).filter((t) => holds(t, forms)).length, "texts on globals the runs added that hold a key").toBe(0);
  });

  it("no key was written to a file, in the repository (node_modules too), the home folder or any temporary folder", async () => {
    const forms = await keys();
    const files = [...new Set(ROOTS.flatMap((root) => writtenSince(root, started())))];
    const holding = files.filter((file) => { try { return holds(readFileSync(file, "latin1"), forms); } catch { return false; } });
    expect(holding, "files written during the runs that hold a key").toEqual([]);
  });
});
