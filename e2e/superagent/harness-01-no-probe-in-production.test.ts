// GOAL17-check-harness, call 5: a probe answers only where the server hosts worlds. Its descriptor is what a journey imports; its handler is a
// `testing.ts`, imported only by the world's own entry. Three of the record's guards are here (the fourth, a lint rule, is slice 9's):
//   - what a journey reaches: no `testing.ts`, no stand-in `main.ts`, no server-side package (green today, and planted below);
//   - what the production Worker's entry reaches: no `testing.ts`, and no text `/_world/probe` (green today, and planted below);
//   - that the world's own entry registers the probes: `generated/server/world.ts` imports the agents' `testing.ts` (red until slice 9).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { superagent } from "./app.ts";
import { here } from "./agents-support.ts";

type Read = (path: string) => string | undefined;
/** The names a file imports, statically, re-exported or by `import()`: each on its own line or ending one (a generated file's, and a journey's). */
const importsOf = (text: string): ReadonlyArray<string> => [...new Set([...text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g), ...text.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g), ...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]!))];
const diskRead: Read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : undefined);

/** Every file reachable from `roots` by relative imports and by `@orthograph/*` and `orthograph` names resolved as the app resolves them, with the chain that led to it. */
const reach = (read: Read, roots: ReadonlyArray<string>, resolveName: (from: string, name: string) => string | undefined) => {
  const seen = new Map<string, ReadonlyArray<string>>(roots.map((r) => [r, [r]]));
  const queue = [...roots];
  while (queue.length > 0 && seen.size < 6000) {
    const file = queue.shift()!;
    const text = read(file);
    if (text === undefined) continue;
    for (const name of importsOf(text)) {
      const target = name.startsWith(".") ? [resolve(dirname(file), name), `${resolve(dirname(file), name)}.ts`].find((p) => read(p) !== undefined) : /^(@orthograph\/|orthograph)/.test(name) ? resolveName(file, name) : undefined;
      if (target !== undefined && !seen.has(target)) { seen.set(target, [...seen.get(file)!, target]); queue.push(target); }
    }
  }
  return seen;
};

const isTesting = (f: string) => /(^|\/)testing\.ts$/.test(f);
const isStandInMain = (f: string) => /stand-in[^/]*\/(src\/)?main\.ts$/.test(f) || /stand-in(-model)?\/src\/main\.ts$/.test(f);
const SERVER_SIDE = /^@orthograph\/(host-cloudflare|prove|language-effect|compiler|generators|projections|cli)(\/|$)/;

const appResolver = (root: string) => { const req = createRequire(join(root, "package.json")); return (_from: string, name: string) => { try { return req.resolve(name); } catch { return undefined; } }; };

/** What a journey file reaches that it may not: a probe's handler, a stand-in's entry, or a server-side package. */
export const journeyBreaches = (read: Read, files: ReadonlyArray<string>, resolveName: (from: string, name: string) => string | undefined) => {
  const found = reach(read, files, resolveName);
  const names = [...found.keys()].flatMap((f) => importsOf(read(f) ?? "").map((n) => ({ from: f, name: n })));
  return [
    ...[...found.keys()].filter((f) => isTesting(f) || isStandInMain(f)),
    ...names.filter((n) => SERVER_SIDE.test(n.name) || /\/testing(\.ts)?$/.test(n.name)).map((n) => `${n.from} imports ${n.name}`),
  ];
};

describe("harness 01: a probe is reachable only where worlds are hosted", () => {
  const journeyFiles = () => ["agent-journeys", "kit", "starting-worlds"].flatMap((d) => (existsSync(join(here, d)) ? readDir(join(here, d)) : []));
  const readDir = (d: string): ReadonlyArray<string> => readdirSync(d).filter((f) => f.endsWith(".ts")).map((f) => join(d, f));

  it("control: the walker finds a testing.ts, a stand-in's main.ts and a server-side package when one is planted in a journey", () => {
    const files: Record<string, string> = {
      "/j/a.ts": `import { calls } from "./b.ts";`, "/j/b.ts": `import "@orthograph/agents/testing";\nimport x from "@orthograph/host-cloudflare";`,
      "/j/c.ts": `import "./stand-in/src/main.ts";`, "/j/stand-in/src/main.ts": `export {};`,
    };
    const planted = journeyBreaches((p) => files[p], ["/j/a.ts", "/j/c.ts"], (_f, n) => (n.endsWith("testing") ? "/p/agents/src/modules/agent/testing.ts" : undefined));
    expect(planted.some((b) => b.includes("@orthograph/agents/testing"))).toBe(true);
    expect(planted.some((b) => b.includes("@orthograph/host-cloudflare"))).toBe(true);
    expect(planted.some((b) => b.endsWith("stand-in/src/main.ts"))).toBe(true);
    expect(journeyBreaches((p) => ({ "/j/a.ts": `import { models } from "@orthograph/stand-in-model/stand";` })[p], ["/j/a.ts"], () => undefined)).toEqual([]);
  });

  it("a journey, its kit and its starting worlds reach no testing.ts, no stand-in entry and no server-side package", () => {
    const files = journeyFiles();
    expect(files.length, "no journeys").toBeGreaterThan(0);
    expect(journeyBreaches(diskRead, files, appResolver(superagent))).toEqual([]);
  });

  it("control: a planted testing.ts import in the production entry is found", () => {
    const entry = "/w/main.ts";
    const files: Record<string, string> = { [entry]: `import "./world.ts";`, "/w/world.ts": `import "./testing.ts";`, "/w/testing.ts": `export const probe = "/_world/probe/agent/calls";` };
    expect([...reach((p) => files[p], [entry], () => undefined).keys()].filter(isTesting)).toEqual(["/w/testing.ts"]);
  });

  it("the production Worker's entry reaches no testing.ts, and its files name no probe route", () => {
    const entry = join(superagent, "generated/server/main.ts");
    expect(existsSync(entry), "the generated production entry").toBe(true);
    const found = reach(diskRead, [entry], appResolver(superagent));
    expect(found.size, "the walk reached nothing").toBeGreaterThan(1);
    expect([...found.keys()].filter(isTesting)).toEqual([]);
    expect([...found.keys()].filter((f) => (diskRead(f) ?? "").includes("/_world/probe"))).toEqual([]);
  });

  it("the world's own entry imports the agents' testing.ts, which registers their probes (slice 9)", () => {
    const world = join(superagent, "generated/server/world.ts");
    expect(existsSync(world), "generated/server/world.ts does not exist: slice 9 generates the world's own entry, the only file allowed to import a testing.ts (GOAL17-check-harness, call 5)").toBe(true);
    expect(importsOf(readFileSync(world, "utf8")).some((n) => /^@orthograph\/agents\/testing$/.test(n))).toBe(true);
  });
});
