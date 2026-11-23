// What check 16 shares: the values the fixture plants, the search that finds them, and the world every output is read in.
// Each value is unique to a run, so a value found in any captured byte went there through some output.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Collectors, Worlds } from "@orthograph/prove";
import { freePort } from "./clients.ts";
import { acme, copyOf, fixtures, succeeds } from "./support.ts";

// ---- the planted values ----

/** One value for each field the fixture's answer and refusal carry, and one for each field the handler adds that none declares. */
export interface Sentinels {
  readonly label: string; readonly hint: string;
  readonly note: string; readonly memo: string;
  readonly code: string; readonly pin: string; readonly seal: string;
  readonly residue: string; readonly residueRefusal: string;
}
export type Name = keyof Sentinels;
/** What the declaration says of each: public, private to the organisation's owner, secret, or not named at all. */
export const KIND: Record<Name, "public" | "private" | "secret" | "undeclared"> = {
  label: "public", hint: "public", note: "private", memo: "private", code: "secret", pin: "secret", seal: "secret", residue: "undeclared", residueRefusal: "undeclared",
};
const NAMES = Object.keys(KIND) as ReadonlyArray<Name>;

export const plant = (): Sentinels => {
  const tag = () => randomBytes(6).toString("hex");
  return {
    label: `LABEL-${tag()}`, hint: `HINT-${tag()}`, note: `NOTE-${tag()}`, memo: `MEMO-${tag()}`,
    code: `CODE-${tag()}`, pin: `PIN-${tag()}`, seal: `SEAL-${tag()}`, residue: `ANSWER-RESIDUE-${tag()}`, residueRefusal: `REFUSAL-RESIDUE-${tag()}`,
  };
};

/** Who is looking. `telemetry` is a Collector's file, which no person reads as a role-holder. */
export type Who = "keeper" | "stranger" | "anonymous" | "telemetry";
/** What each may be shown: the public values to all, and the private ones to the principal who holds the role. Never a secret, never an undeclared value. */
export const mayShow = (who: Who, issued = false): ReadonlyArray<Name> => [
  ...(who === "keeper" ? ["label", "hint", "note", "memo"] as const : ["label", "hint"] as const),
  // The lead's revised R1: a secret leaves only in the answer of the call that issued it, to that call's own caller, by a direct door.
  ...(issued ? ["code" as const] : []),
];

/** The planted values in `bytes` that `who` must not be shown: a secret, an undeclared value, or a private value to a non-holder. */
export const leaks = (bytes: string, who: Who, planted: Sentinels, issued = false): ReadonlyArray<string> =>
  NAMES.filter((name) => !mayShow(who, issued).includes(name) && bytes.includes(planted[name])).map((name) => `${name} (${KIND[name]})`);

/** The values `who` is shown that the output must carry: the public ones, and the private ones for the principal who holds the role. */
export const missing = (bytes: string, who: Who, planted: Sentinels, names: ReadonlyArray<Name>, issued = false): ReadonlyArray<string> =>
  names.filter((name) => mayShow(who, issued).includes(name) && !bytes.includes(planted[name])).map((name) => `${name} (${KIND[name]})`);

// ---- the project: acme with the locker fixture laid over it ----

export const sentinelFile = (planted: Sentinels) =>
  `// Scaffolded from blueprint/things/locker/verbs/open.ts. Yours from now on.\nexport const sentinels = ${JSON.stringify(planted, null, 2)} as const;\n`;

/** Whether `Blueprint.issued` exists yet: the fixture marks `code` with it only then, so the controls stay runnable until it does. */
export const hasIssued = (): boolean => {
  const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `const m = await import("orthograph"); console.log(typeof m.Blueprint?.issued);`], { cwd: acme, encoding: "utf8" });
  return probe.stdout.trim().split("\n").at(-1) === "function";
};
const openFile = "blueprint/things/locker/verbs/open.ts";
/** The fixture laid over a copy of acme, the planted values written in, and `edit` applied to `locker.open`'s declaration. */
export const overlay = (planted: Sentinels, edit?: (source: string) => string) => {
  const copy = copyOf(acme);
  cpSync(join(fixtures, "visibility"), copy.root, { recursive: true });
  writeFileSync(join(copy.root, "src/sentinels.ts"), sentinelFile(planted));
  if (edit) writeFileSync(join(copy.root, openFile), edit(readFileSync(join(copy.root, openFile), "utf8")));
  return copy;
};
/** acme with `e2e/fixtures/m1/visibility` over it, `code` marked `Blueprint.issued` once that exists, and generated. */
export const lockerProject = (planted: Sentinels) => {
  const copy = overlay(planted, hasIssued() ? (source) => source.replace("code: Locker.fields.code,", "code: Blueprint.issued(Locker.fields.code),") : undefined);
  succeeds(copy.root, "generate");
  return copy;
};

/** Every file under `dir`, as text, with its path: what a search over a folder looks in. */
export const filesUnder = (root: string, dir: string): ReadonlyArray<{ readonly path: string; readonly text: string }> =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      return entry.isDirectory() ? filesUnder(root, path) : [{ path, text: readFileSync(join(root, path), "utf8") }];
    })
    : [];

// ---- the world, and the Collector's files ----

export interface Person { readonly person: string; readonly token: string; readonly email: string; readonly password: string }
export interface Live {
  readonly url: string;
  /** The Collector's files: `traces.jsonl`, `logs.jsonl`, `metrics.jsonl`, whole, as they are now. */
  readonly collected: () => { readonly traces: string; readonly logs: string; readonly metrics: string };
  readonly cast: (...names: ReadonlyArray<string>) => Promise<Record<string, Person>>;
  readonly journal: (trace: string) => Promise<string>;
}

const readOr = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** A world on workerd, exporting to a loopback Collector that strips nothing (so the runtime's own rule is what is judged), for the life of the handle. */
export const liveWorld = (root: string) => {
  const scope = Effect.runSync(Scope.make());
  const dir = mkdtempSync(join(tmpdir(), "ortho-m1-visibility-"));
  mkdirSync(dir, { recursive: true });
  return {
    open: () => Effect.runPromise(Effect.gen(function* () {
      const collector = yield* Collectors.local(dir, []);
      const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name: "m1-visibility", otlp: collector.url });
      const live: Live = {
        url: world.url,
        collected: () => ({ traces: readOr(join(dir, "traces.jsonl")), logs: readOr(join(dir, "logs.jsonl")), metrics: readOr(join(dir, "metrics.jsonl")) }),
        cast: (...names) => fetch(`${world.url}/_world/cast`, { method: "POST", body: JSON.stringify({ names }) }).then((r) => r.json()) as ReturnType<Live["cast"]>,
        journal: (trace) => fetch(`${world.url}/_world/facts/journal?trace=${trace}`).then((r) => r.text()),
      };
      return live;
    }).pipe(Scope.provide(scope))),
    close: async () => { await Effect.runPromise(Scope.close(scope, Exit.void)); rmSync(dir, { recursive: true, force: true }); },
  };
};

/** How often `name` is the name of a span in the Collector's trace file. */
export const spansNamed = (traces: string, name: string) => traces.split(`"name":"${name}"`).length - 1;

export const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** Poll `read` until `done` holds, or give up after `ms` and return what it last saw. */
export const until = async <A>(read: () => Promise<A> | A, done: (a: A) => boolean, ms = 30_000) => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await sleep(100); last = await read(); }
  return last;
};
/** The trace ids of the spans with this name, from the Collector's trace file. */
export const tracesOf = (traces: string, name: string): ReadonlyArray<string> => {
  const ids = new Set<string>();
  for (const line of traces.split("\n").filter((l) => l.length > 0)) {
    try {
      const doc = JSON.parse(line) as { resourceSpans?: ReadonlyArray<{ scopeSpans?: ReadonlyArray<{ spans?: ReadonlyArray<{ name?: string; traceId?: string }> }> }> };
      for (const rs of doc.resourceSpans ?? []) for (const ss of rs.scopeSpans ?? []) for (const span of ss.spans ?? []) if (span.name === name && span.traceId) ids.add(span.traceId);
    } catch { /* a line that is not a document is not a span */ }
  }
  return [...ids];
};
