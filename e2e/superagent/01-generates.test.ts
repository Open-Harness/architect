// Check 01 (Goal 17 slice 3): `ortho new adapter <name> --from-openapi <spec>` makes a plugin of exactly what the spec
// publishes. GitHub's, PostHog's and Slack's specs, each cut to a pinned fixture (specs/README.md); the whole specs are
// check 06's. Red until slice 4 builds the generator: `ortho new` does not exist yet.
//
// What it reads: the command's exit and last line, the plugin's files and their first lines, and the descriptor the
// package exports (its calls and events), each judged against the spec's own operations and webhooks (spec.ts).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { NAMES, trimmed, type Name } from "./pins.ts";
import { build, callNames, descriptor, filesUnder, manifest, newAdapter, pluginDir, project, read, removeProjects, run as ortho } from "./plugin.ts";
import { operations, readSpec, webhooks } from "./spec.ts";

afterEach(removeProjects);
const scratch = mkdtempSync(join(tmpdir(), "ortho-superagent-spec-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The line a generated or scaffolded file opens with (AGENTS.md): after a shebang, when there is one. */
const header = (text: string) => text.split("\n").find((l) => !l.startsWith("#!")) ?? "";
const GENERATED = /^\/\/ Generated from .+\. Do not edit\.$/;
const SCAFFOLDED = /^\/\/ Scaffolded from .+\. Yours from now on\.$/;

const generate = (name: Name, spec = trimmed(name)) => {
  const { root } = project();
  const run = newAdapter(root, name, spec);
  expect(run.status, run.out).toBe(0);
  return { root, run, dir: pluginDir(root, name) };
};

describe.each(NAMES)("01 %s: its spec generates a plugin", (name) => {
  const spec = readSpec(trimmed(name));
  const ops = operations(spec);
  const events = webhooks(spec);

  it("says what it made, and writes the package: @orthograph/<name>, an adapter", () => {
    const { run, dir } = generate(name);
    expect(run.status, run.out).toBe(0);
    expect(run.stdout.trimEnd().split("\n").at(-1)).toBe(`generated adapter ${name}: ${ops.length} calls, ${events.length} events from ${spec.title} ${spec.version}`);
    const pkg = manifest(dir);
    expect(pkg["name"]).toBe(`@orthograph/${name}`);
    expect(pkg["orthograph"]?.["kind"]).toBe("adapter");
    expect(pkg["exports"]?.["."], "the entry").toBeDefined();
    expect(pkg["exports"]?.["./client"], "the client").toBeDefined();
  });

  it("every TypeScript file it writes opens with the Generated line, naming the spec, or a Scaffolded one", () => {
    const { dir } = generate(name);
    const files = filesUnder(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    const generated = files.filter((f) => GENERATED.test(header(read(join(dir, f)))));
    expect(generated.length, "some file is generated").toBeGreaterThan(0);
    for (const f of files) expect(header(read(join(dir, f))), f).toMatch(new RegExp(`${GENERATED.source}|${SCAFFOLDED.source}`));
    for (const f of generated) expect(header(read(join(dir, f))), f).toContain(`${spec.title} ${spec.version}`);
  });

  it("its calls are exactly the spec's operations, under the naming rule: none missing, none added, none twice", async () => {
    const { dir } = generate(name);
    build(dir);
    const adapter = await descriptor(dir);
    expect(adapter["kind"]).toBe("adapter");
    expect(callNames(adapter["calls"] ?? {})).toEqual(ops.map((o) => o.name).sort());
  });

  it("its events are exactly the spec's: GitHub's webhooks by event name, and none from a spec that has none", async () => {
    const { dir } = generate(name);
    build(dir);
    const adapter = await descriptor(dir);
    expect(Object.keys(adapter["events"] ?? {}).sort()).toEqual(events.map((e) => e.name).sort());
    for (const e of events) expect(adapter["events"][e.name]?.schema, `${e.name} has the payload's schema`).toBeDefined();
  });

  it("generating again writes the same files, byte for byte", () => {
    const a = generate(name);
    const b = generate(name);
    expect(filesUnder(b.dir)).toEqual(filesUnder(a.dir));
    for (const f of filesUnder(a.dir)) expect(read(join(b.dir, f)), f).toBe(read(join(a.dir, f)));
  });

  it("regenerating puts a generated file back and leaves a hand-written one alone", () => {
    const { root, dir } = generate(name);
    const [file] = filesUnder(dir).filter((f) => f.endsWith(".ts") && GENERATED.test(header(read(join(dir, f)))));
    const original = read(join(dir, file!));
    writeFileSync(join(dir, file!), `${original}\n// somebody edited this\n`);
    mkdirSync(join(dir, "src"), { recursive: true });
    const hand = "// Scaffolded from nowhere. Yours from now on.\nexport const mine = 1;\n";
    writeFileSync(join(dir, "src/mine.ts"), hand);
    const again = newAdapter(root, name, trimmed(name));
    expect(again.status, again.out).toBe(0);
    expect(read(join(dir, file!))).toBe(original);
    expect(read(join(dir, "src/mine.ts"))).toBe(hand);
  });
});

describe("01 posthog: the spec its own URL serves is YAML, and generates the same plugin", () => {
  it("the same document in YAML makes the same files, byte for byte: the Generated line names the spec's title and version, not its path or format", () => {
    const json = join(scratch, "posthog.json");
    const yaml = join(scratch, "posthog.yaml");
    cpSync(trimmed("posthog"), json);
    writeFileSync(yaml, stringify(parse(readFileSync(json, "utf8"))));
    const a = generate("posthog", json);
    const b = generate("posthog", yaml);
    expect(a.run.status, a.run.out).toBe(0);
    expect(b.run.status, b.run.out).toBe(0);
    expect(filesUnder(b.dir)).toEqual(filesUnder(a.dir));
    for (const f of filesUnder(a.dir)) expect(read(join(b.dir, f)), f).toBe(read(join(a.dir, f)));
  });
});

describe("01 refusals: nothing is written, and the message says what is wrong", () => {
  const untouched = (root: string) => expect(filesUnder(join(root, "plugins"))).toEqual([]);
  const bad = (file: string, text: string) => { const path = join(scratch, file); writeFileSync(path, text); return path; };

  it("a spec that isn't there", () => {
    const { root } = project();
    const r = newAdapter(root, "github", join(scratch, "nope.json"));
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/could not read .*nope\.json/);
    untouched(root);
  });

  it("a file that isn't JSON or YAML", () => {
    const { root } = project();
    const run = newAdapter(root, "github", bad("junk.json", "{ this is: [not, a document"));
    expect(run.status).not.toBe(0);
    expect(run.out).toMatch(/could not parse .*junk\.json/);
    untouched(root);
  });

  it("a document that isn't an OpenAPI or Swagger description", () => {
    const { root } = project();
    const run = newAdapter(root, "github", bad("other.json", JSON.stringify({ name: "a package", version: "1.0.0" })));
    expect(run.status).not.toBe(0);
    expect(run.out).toMatch(/not an OpenAPI or Swagger description/);
    untouched(root);
  });

  it("an OpenAPI description with no operations", () => {
    const { root } = project();
    const run = newAdapter(root, "github", bad("empty.json", JSON.stringify({ openapi: "3.1.0", info: { title: "Empty", version: "1" }, paths: {} })));
    expect(run.status).not.toBe(0);
    expect(run.out).toMatch(/no operations/);
    untouched(root);
  });

  it("no --from-openapi, and a name that isn't lower case words", () => {
    const { root } = project();
    const a = ortho(root, ["new", "adapter", "github"]);
    expect(a.status).not.toBe(0);
    expect(a.out).toMatch(/--from-openapi/);
    const b = newAdapter(root, "Git Hub", trimmed("github"));
    expect(b.status).not.toBe(0);
    expect(b.out).toMatch(/lower case words/);
    untouched(root);
  });
});
