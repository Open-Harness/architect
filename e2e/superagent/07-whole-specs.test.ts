// Check 07 (Goal 17 slice 3): the whole published specs generate, not only the fixtures cut from them. GitHub's is 14 MB
// and PostHog's 21 MB, so each is fetched once into tmp/specs/ from the URL specs/pins.json pins and judged by its hash
// (pins.ts); a second run uses the cache. Nothing here needs a key: the specs are public.
//
// It also keeps the held plugins honest: every file of examples/superagent/plugins/<name> that says it is generated is
// what the generator makes of the pinned spec today, byte for byte, so nobody has edited one by hand.
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { NEEDS, appPlugin } from "./needs.ts";
import { NAMES, PINS, fullSpec, trimmed, type Name } from "./pins.ts";
import { build, callNames, descriptor, filesUnder, newAdapter, pluginDir, project, read, removeProjects } from "./plugin.ts";
import { operationNamed, operations, readSpec, webhooks } from "./spec.ts";

afterEach(removeProjects);
const scratch = mkdtempSync(join(tmpdir(), "ortho-superagent-whole-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const GENERATED = /^\/\/ Generated from .+\. Do not edit\.$/;
const isGenerated = (text: string) => GENERATED.test(text.split("\n").find((l) => !l.startsWith("#!")) ?? "");

describe.each(NAMES)("07 %s: the whole spec", (name: Name) => {
  const pin = PINS[name];
  const cache = async () => {
    const got = await fullSpec(name);
    if (got.drifted) console.warn(`${name}: ${pin.url} no longer serves the pinned bytes (${pin.sha256.slice(0, 12)}); judging what it serves now. Re-pin: e2e/superagent/specs/README.md`);
    return got;
  };

  it("is the pinned spec, and has as many calls and events as when it was pinned", async () => {
    const got = await cache();
    const spec = readSpec(got.file);
    if (!got.drifted) {
      expect(`${spec.title} ${spec.version}`).toBe(`${pin.title} ${pin.version}`);
      expect(operations(spec)).toHaveLength(pin.counts.operations);
      expect(webhooks(spec)).toHaveLength(pin.counts.events);
    }
    expect(operations(spec).length).toBeGreaterThan(100);
  });

  it("holds every call and event the superagent includes, each as the fixture has it", async () => {
    const full = readSpec((await cache()).file);
    const cut = readSpec(trimmed(name));
    for (const call of NEEDS[name].calls) expect(operationNamed(cut, call), call).toEqual(operationNamed(full, call));
    if (name === "github") {
      for (const event of NEEDS.github.events) {
        const [a, b] = [webhooks(full).find((e) => e.name === event), webhooks(cut).find((e) => e.name === event)];
        expect(a, event).toBeDefined();
        for (const action of b!.actions) expect(a!.actions.find((x) => x.entry === action.entry), action.entry).toEqual(action);
      }
    }
  });

  it("generates a plugin of exactly its operations and events", async () => {
    const got = await cache();
    const spec = readSpec(got.file);
    const { root } = project();
    const run = newAdapter(root, name, got.file);
    expect(run.status, run.out).toBe(0);
    expect(run.stdout.trimEnd().split("\n").at(-1)).toBe(`generated adapter ${name}: ${operations(spec).length} calls, ${webhooks(spec).length} events from ${spec.title} ${spec.version}`);
    build(pluginDir(root, name));
    const adapter = await descriptor(pluginDir(root, name));
    expect(callNames(adapter["calls"] ?? {})).toEqual(operations(spec).map((o) => o.name).sort());
    expect(Object.keys(adapter["events"] ?? {}).sort()).toEqual(webhooks(spec).map((e) => e.name).sort());
  });

  it("is what the app holds: each generated file of the held plugin is what the generator makes of this spec", async () => {
    const got = await cache();
    if (got.drifted) return;
    const copy = join(scratch, `${name}.json`);
    cpSync(got.file, copy);
    const { root } = project();
    const run = newAdapter(root, name, copy);
    expect(run.status, run.out).toBe(0);
    const fresh = filesUnder(pluginDir(root, name)).filter((f) => isGenerated(read(join(pluginDir(root, name), f))));
    const held = filesUnder(appPlugin(name));
    expect(fresh.length).toBeGreaterThan(0);
    for (const f of fresh) {
      expect(held, `the held plugin has ${f}`).toContain(f);
      expect(read(join(appPlugin(name), f)), `${f} is the generator's output`).toBe(read(join(pluginDir(root, name), f)));
    }
    for (const f of held.filter((h) => isGenerated(read(join(appPlugin(name), h))))) expect(fresh, `${f} says it is generated, and the generator makes it`).toContain(f);
  });
});
