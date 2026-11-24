// Goal 17 slice 5, review fixes: a delivery a feature mount's `on` verb declares is in the operation's model, and a read the runtime
// does not serve yet (it pins a field, or derives its answer) can refuse by name: `ReadNotServed` is a modelled refusal.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { BlueprintSource, type LoadedFile } from "#modules/source/types.js";
import { Compiler } from "./service.ts";

const Echo = Blueprint.thing({ description: "Says back.", fields: { id: Blueprint.id("ech") }, code: "EC" });
const Said = Blueprint.event({ echo: Echo.fields.id });
const repeat = Blueprint.operation(Echo, { description: "Repeat.", payload: { echo: Echo.fields.id }, answer: {}, allowed: [Blueprint.system] });
const listed = Blueprint.read(Echo, { where: ["id"], only: { id: "ech_1" }, order: "oldest", page: 5, allowed: [Blueprint.signedIn] });
const plain = Blueprint.read(Echo, { where: ["id"], order: "oldest", page: 5, allowed: [Blueprint.signedIn] });
const feature = Blueprint.feature({ description: "Echoes." });
const file = (path: string, exports: Record<string, unknown>): LoadedFile => ({ path, exports });

const model = (mount: unknown, reads: Record<string, unknown> = {}) => {
  const plugin = [file("things/echo/thing.js", { Echo }), file("things/echo/events.js", { Said }), file("things/echo/verbs/repeat.js", { default: repeat })];
  const app = [file("features/echo.ts", { default: mount }), ...Object.entries(reads).map(([n, r]) => file(`things/echo/verbs/${n}.ts`, { default: r }))];
  const source = Layer.succeed(BlueprintSource, {
    list: Effect.succeed(app.map((f) => f.path)), load: (path) => Effect.succeed(app.find((f) => f.path === path)!),
    plugins: Effect.succeed([{ name: "@fixture/echo", version: "1.0.0", kind: "feature", descriptor: feature }]),
    pluginFiles: () => Effect.succeed({ integrity: "sha256-x", files: plugin.map((f) => ({ ...f, specifier: `@fixture/echo/blueprint/${f.path}` })) }),
  });
  return Effect.runPromise(Compiler.model.pipe(Effect.provide(source)));
};

describe("a delivery a mount's `on` verb declares", () => {
  it("is in the model of the operation it calls, beside the operation's own `on:`", async () => {
    const m = await model(Blueprint.use(feature, (p) => [p.on(Said, repeat, (e) => ({ echo: e.echo }))]));
    expect(m.operations["echo.repeat"]?.on).toEqual([{ event: "Said", thing: "echo" }]);
  });

  it("is absent when no mount delivers to it", async () => {
    const m = await model(Blueprint.use(feature));
    expect(m.operations["echo.repeat"]).not.toHaveProperty("on");
  });
});

const watching = Blueprint.read(Echo, { by: "id", fields: ["id"], derive: Blueprint.derive(Echo, { looks: { watched: Blueprint.problems() }, adds: { ok: Blueprint.bool() }, is: () => ({ ok: true }) }), allowed: [Blueprint.signedIn] });

describe("a read the runtime does not serve yet", () => {
  it("can refuse ReadNotServed only when its derive looks at the app's problems: modelled on the read, and a framework refusal with a code of its own", async () => {
    const m = await model(Blueprint.use(feature), { pinned: listed, plain, watching });
    expect(m.operations["echo.watching"]?.refusals).toContain("ReadNotServed");
    expect(m.operations["echo.pinned"]?.refusals, "a pinned read is served").not.toContain("ReadNotServed");
    expect(m.operations["echo.plain"]?.refusals).not.toContain("ReadNotServed");
    expect(m.refusals["ReadNotServed"]).toBe("AR-008");
  });

  it("leaves a blueprint with no such read exactly as it was: the refusal is not in its model", async () => {
    const m = await model(Blueprint.use(feature), { plain });
    expect(m.refusals).not.toHaveProperty("ReadNotServed");
  });
});
