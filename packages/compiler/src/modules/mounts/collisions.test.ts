// Goal 17 slice 5: names that two files claim are refused, each message naming both files. A folder of verbs with no thing.ts adds
// operations to a thing another plugin or the app brings, and a verb, a source, an agent or a hold is named once for the project.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, Source } from "orthograph";
import { BlueprintSource, type LoadedFile } from "#modules/source/types.js";
import { readLayout } from "#modules/model/internal/layout.js";
import { Compiler } from "#modules/model/service.js";
import { holdsModel } from "#modules/model/internal/holds.js";
import { blueprintFilesOf } from "#modules/source/internal/plugins.js";
import { Mounts } from "./service.ts";

const Echo = Blueprint.thing({ description: "Says back.", fields: { id: Blueprint.id("ech") }, code: "EC" });
const verb = (description: string) => Blueprint.operation(Echo, { description, payload: {}, answer: {}, allowed: [Blueprint.anyone] });
const features = ["one", "two", "three"].map((n) => Blueprint.feature({ description: `Feature ${n}.` }));
const [one, two, three] = features as [typeof features[0], typeof features[0], typeof features[0]];

const file = (path: string, exports: Record<string, unknown>): LoadedFile => ({ path, exports });
const echoThing = file("things/echo/thing.js", { Echo });
const adds = (name: string, ...verbs: ReadonlyArray<string>) => verbs.map((v) => file(`things/echo/verbs/${v}.js`, { default: verb(`${name} ${v}`) }));

const sourceOf = (plugins: Record<string, { readonly descriptor: unknown; readonly files: ReadonlyArray<LoadedFile> }>, app: ReadonlyArray<LoadedFile> = []) => Layer.succeed(BlueprintSource, {
  list: Effect.succeed(app.map((f) => f.path)),
  load: (path) => Effect.succeed(app.find((f) => f.path === path)!),
  plugins: Effect.succeed(Object.entries(plugins).map(([name, p]) => ({ name, version: "1.0.0", kind: "feature", descriptor: p.descriptor }))),
  pluginFiles: (name) => Effect.succeed({ integrity: "sha256-x", files: plugins[name]!.files.map((f) => ({ ...f, specifier: `${name}/blueprint/${f.path}` })) }),
});
const mountsOf = (...names: ReadonlyArray<string>) => readLayout(names.map((n, i) => file(`features/${n}.ts`, { default: Blueprint.use(features[i]!) })));
const fold = (plugins: Parameters<typeof sourceOf>[0], ...names: ReadonlyArray<string>) => Effect.runPromise(Mounts.fold(mountsOf(...names)).pipe(Effect.provide(sourceOf(plugins))));

describe("a verb added to a thing another plugin brings", () => {
  it("is refused when the thing already has it, naming both files", async () => {
    const folded = await fold({
      "@fixture/one": { descriptor: one, files: [echoThing, ...adds("one", "repeat")] },
      "@fixture/two": { descriptor: two, files: adds("two", "repeat") },
    }, "one", "two");
    expect(folded.problems).toHaveLength(1);
    expect(folded.problems[0]).toMatch(/blueprint\/features\/two\.ts: @fixture\/two adds echo\.repeat \(@fixture\/two\/blueprint\/things\/echo\/verbs\/repeat\.js\), which echo already has \(@fixture\/one\/blueprint\/things\/echo\/verbs\/repeat\.js\)/);
  });

  it("is refused when two plugins add the same one, and each other verb is added", async () => {
    const folded = await fold({
      "@fixture/one": { descriptor: one, files: [echoThing] },
      "@fixture/two": { descriptor: two, files: adds("two", "shout", "whisper") },
      "@fixture/three": { descriptor: three, files: adds("three", "shout") },
    }, "one", "two", "three");
    expect(folded.problems).toHaveLength(1);
    expect(folded.problems[0]).toMatch(/adds echo\.shout \(@fixture\/t(?:wo|hree)\/blueprint\/things\/echo\/verbs\/shout\.js\), which echo already has \(@fixture\/t(?:wo|hree)\/blueprint\/things\/echo\/verbs\/shout\.js\)/);
    expect([...folded.things.get("echo")!.verbs.keys()].sort()).toEqual(["shout", "whisper"]);
  });
});

describe("a verb added through a mount under an alias", () => {
  const plugins = { "@fixture/one": { descriptor: one, files: [echoThing, ...adds("one", "repeat")] }, "@fixture/two": { descriptor: two, files: adds("two", "shout") } };
  const aliased = (...mounts: ReadonlyArray<readonly [string, typeof one]>) =>
    Effect.runPromise(Mounts.fold(readLayout(mounts.map(([n, f]) => file(`features/${n}.ts`, { default: Blueprint.use(f) })))).pipe(Effect.provide(sourceOf(plugins))));

  it("finds the thing by identity when the adding plugin is mounted under another name", async () => {
    const folded = await aliased(["one", one], ["work", two]);
    expect(folded.problems).toEqual([]);
    expect([...folded.things.get("echo")!.verbs.keys()].sort()).toEqual(["repeat", "shout"]);
    expect(folded.things.get("echo")!.verbs.get("shout")!.from).toMatchObject({ kind: "feature", mount: "work", package: "@fixture/two", thing: "echo" });
    expect(folded.things.has("work-echo")).toBe(false);
  });

  it("finds the thing by identity when the owner is mounted under another name", async () => {
    const folded = await aliased(["theirs", one], ["two", two]);
    expect(folded.problems).toEqual([]);
    expect([...folded.things.get("theirs-echo")!.verbs.keys()].sort()).toEqual(["repeat", "shout"]);
  });
});

describe("a source or an agent named by its file", () => {
  it("is refused when two plugins bring one by that name, naming both files", async () => {
    const same = [file("sources/ticker.js", { ticker: Source.timer }), file("agents/main.js", { default: Blueprint.agent({ model: "m" }) })];
    const folded = await fold({ "@fixture/one": { descriptor: one, files: [echoThing, ...same] }, "@fixture/two": { descriptor: two, files: same } }, "one", "two");
    expect(folded.problems.some((p) => /brings source ticker \(@fixture\/two\/blueprint\/sources\/ticker\.js\), and @fixture\/one\/blueprint\/sources\/ticker\.js brings one by that name/.test(p))).toBe(true);
    expect(folded.problems.some((p) => /brings agent main \(@fixture\/two\/blueprint\/agents\/main\.js\), and one brings one by that name/.test(p))).toBe(true);
  });

  it("is refused when the app has one of the same name as a plugin's", async () => {
    const app = [
      file("features/one.ts", { default: Blueprint.use(one) }),
      file("sources/ticker.ts", { ticker: Source.timer }),
      file("agents/main.ts", { default: Blueprint.agent({ model: "m" }) }),
      file("things/echo/verbs/repeat.ts", { default: verb("the app's") }),
    ];
    const plugin = [echoThing, ...adds("one", "repeat"), file("sources/ticker.js", { ticker: Source.timer }), file("agents/main.js", { default: Blueprint.agent({ model: "m" }) })];
    const exit = await Effect.runPromise(Effect.flip(Compiler.model.pipe(Effect.provide(sourceOf({ "@fixture/one": { descriptor: one, files: plugin } }, app)))));
    const said = JSON.stringify(exit);
    expect(said).toMatch(/blueprint\/sources\/ticker\.ts: the app's source ticker has the name of the one one brings/);
    expect(said).toMatch(/blueprint\/agents\/main\.ts: the app's agent main has the name of the one one brings/);
    expect(said).toMatch(/blueprint\/things\/echo\/verbs\/repeat\.ts: adds echo\.repeat, which echo already has/);
  });
});

describe("a hold named by its export", () => {
  it("is refused when two things export one name, naming both files", () => {
    const A = Blueprint.thing({ description: "A.", fields: { id: Blueprint.id("aaa") }, code: "AA" });
    const B = Blueprint.thing({ description: "B.", fields: { id: Blueprint.id("bbb") }, code: "BB" });
    const layout = readLayout([
      file("things/a/thing.ts", { A }), file("things/a/holds.ts", { processing: Blueprint.hold(A, { key: A.fields.id, while: [] }) }),
      file("things/b/thing.ts", { B }), file("things/b/holds.ts", { processing: Blueprint.hold(B, { key: B.fields.id, while: [] }) }),
    ]);
    const problems: Array<string> = [];
    holdsModel({ layout, things: {}, thingNames: new Map(), eventNames: new Map(), opName: () => undefined, problems });
    expect(problems).toEqual(["blueprint/things/b/holds.ts: the hold processing is already declared in blueprint/things/a/holds.ts: a hold is named for the whole project, so give one another name"]);
  });
});

describe("a plugin that ships both .ts and .js for one file", () => {
  it("loads the .js only", () => {
    const names = blueprintFilesOf(new URL("./fixtures/both", import.meta.url).pathname);
    expect(names).toEqual(["things/echo/thing.js", "things/echo/verbs/only.ts"]);
  });
});
