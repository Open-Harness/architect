// `ortho new adapter`: reads JSON or YAML, writes only when the whole plugin can be made, and puts generated files back.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { New } from "./service.ts";

const dir = mkdtempSync(join(tmpdir(), "ortho-new-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const spec = { openapi: "3.1.0", info: { title: "Widgets", version: "2.0.0" }, paths: { "/ping": { get: { operationId: "ping", responses: { "200": { content: { "application/json": { schema: { type: "object" } } } } } } } } };
const run = (from: string, name = "widgets") => Effect.runSync(Effect.result(New.adapter({ root: dir, name, from })));

describe("New.adapter", () => {
  it("makes the same plugin from the same document as JSON and as YAML, and says what it made last", () => {
    writeFileSync(join(dir, "w.json"), JSON.stringify(spec));
    writeFileSync(join(dir, "w.yaml"), "openapi: 3.1.0\ninfo: { title: Widgets, version: 2.0.0 }\npaths:\n  /ping:\n    get:\n      operationId: ping\n      responses:\n        '200':\n          content:\n            application/json:\n              schema: { type: object }\n");
    const json = run(join(dir, "w.json"));
    expect(json._tag === "Success" ? json.success.at(-1) : json.failure.message).toBe("generated adapter widgets: 1 calls, 0 events from Widgets 2.0.0");
    const first = readFileSync(join(dir, "plugins/widgets/src/index.ts"), "utf8");
    expect(run(join(dir, "w.yaml"))._tag).toBe("Success");
    expect(readFileSync(join(dir, "plugins/widgets/src/index.ts"), "utf8")).toBe(first);
  });

  it("refuses with nothing written", () => {
    const says = (r: ReturnType<typeof run>) => (r._tag === "Failure" ? r.failure.message : "made");
    expect(says(run(join(dir, "missing.json"), "other"))).toMatch(/could not read .*missing\.json/);
    writeFileSync(join(dir, "junk.json"), "{ this is: [not, a document");
    expect(says(run(join(dir, "junk.json"), "other"))).toMatch(/could not parse .*junk\.json/);
    expect(says(run(join(dir, "w.json"), "Not A Name"))).toMatch(/lower case words/);
    expect(existsSync(join(dir, "plugins/other"))).toBe(false);
  });
});
