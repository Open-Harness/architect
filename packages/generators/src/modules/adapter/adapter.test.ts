// The generator on a small description: the names, the files, the refusals, and the client it makes, run against a probe.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { Effect } from "effect";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { Adapter } from "./service.ts";
import { camel, nameParts } from "./internal/names.ts";
import { embeddedText, RUNTIME_NAMES } from "./internal/embed.ts";

const spec = {
  openapi: "3.1.0", info: { title: "Widgets", version: "2.0.0" },
  paths: {
    "/widgets/{id}": {
      get: { operationId: "widgets/get-one", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^w-\\d+$" } }], responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/widget" } } } } } },
    },
    "/ping": { get: { operationId: "ping_all", responses: { "204": { description: "none" } } } },
  },
  components: { schemas: { widget: { type: "object", required: ["id"], properties: { id: { type: "string" }, size: { type: "integer" } } } } },
};

const made = (input: unknown) => Effect.runSync(Effect.result(Adapter.generate({ name: "widgets", spec: input })));

describe("Adapter.generate", () => {
  it("names a call from its operationId: groups at / and ., each piece camel-cased at - and _", () => {
    expect(nameParts("issues/create-comment")).toEqual(["issues", "createComment"]);
    expect(nameParts("chat_postMessage")).toEqual(["chatPostMessage"]);
    expect(camel("issue_comment")).toBe("issueComment");
  });

  it("makes the same files from the same document, every generated one under its Generated line", () => {
    const [a, b] = [made(spec), made(JSON.parse(JSON.stringify(spec)))];
    if (a._tag !== "Success" || b._tag !== "Success") throw new Error("refused");
    expect(a.success).toMatchObject({ title: "Widgets", version: "2.0.0", calls: 2, events: 0 });
    expect(a.success.files).toEqual(b.success.files);
    for (const f of a.success.files.filter((x) => x.how === "generated")) expect(f.content.split("\n")[0], f.path).toBe("// Generated from Widgets 2.0.0. Do not edit.");
    expect(a.success.files.filter((x) => x.how === "scaffold").map((f) => f.path)).toEqual(["package.json", "blueprint/README.md", "src/written.ts"]);
  });

  it("refuses what isn't a description, a description with nothing to call, and a name that isn't lower case words", () => {
    const says = (r: ReturnType<typeof made>) => (r._tag === "Failure" ? r.failure.message : "made");
    expect(says(made({ name: "a package" }))).toMatch(/not an OpenAPI or Swagger description/);
    expect(says(made({ openapi: "3.1.0", info: { title: "x", version: "1" }, paths: {} }))).toMatch(/no operations/);
    expect(says(Effect.runSync(Effect.result(Adapter.generate({ name: "Wid gets", spec }))))).toMatch(/lower case words/);
  });
});

const files = (input: unknown) => {
  const r = made(input);
  if (r._tag !== "Success") throw new Error(r.failure.message);
  return r.success.files;
};
const one = (id: string, path: string, parameters: ReadonlyArray<unknown>, extra: object = {}) => ({
  openapi: "3.1.0", info: { title: "T", version: "1" },
  paths: { [path]: { post: { operationId: id, parameters, responses: { "200": { description: "ok" } }, ...extra } } },
});

describe("what the generator keeps and refuses", () => {
  it("keeps a path parameter called token, and drops one in the query", () => {
    const data = (spec: unknown) => files(spec).find((f) => f.path === "src/spec/operations.ts")!.content;
    expect(data(one("invites/accept", "/invites/{token}", [{ name: "token", in: "path", required: true, schema: { type: "string" } }]))).toContain('\\"name\\":\\"token\\",\\"in\\":\\"path\\"');
    expect(data(one("invites/list", "/invites", [{ name: "token", in: "query", schema: { type: "string" } }]))).not.toContain("token");
  });

  it("keeps a path parameter and a body field of one name, for the client to refuse that call by name", async () => {
    const spec = one("a/b", "/a/{id}", [{ name: "id", in: "path", required: true, schema: { type: "string" } }], { requestBody: { content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } } } } });
    expect(files(spec).find((f) => f.path === "src/spec/operations.ts")!.content).toContain('\\"in\\":\\"body\\"');
    const { makeClient } = await import("./internal/runtime/client.ts");
    const clash = makeClient([{ name: ["a", "b"], method: "post", path: "/a/{id}", params: [{ name: "id", in: "path", required: true, schema: {} }, { name: "id", in: "body", required: false, schema: {} }], successes: [] }], {}, { baseUrl: "http://127.0.0.1:1" });
    await expect((clash.calls["a"] as Record<string, (i: unknown) => Promise<unknown>>)["b"]!({ id: "x" })).rejects.toMatchObject({ _tag: "InputRefused", problems: [expect.stringMatching(/id is both a path field and a body field/)] });
  });

  it("holds a call or group named like an Object method as a plain name", () => {
    const spec = { ...one("constructor/toString", "/x", []), paths: { "/x": { get: { operationId: "constructor/toString", responses: { "200": { description: "ok" } } } }, "/y": { get: { operationId: "constructor/valueOf", responses: { "200": { description: "ok" } } } } } };
    const index = files(spec).find((f) => f.path === "src/index.ts")!.content;
    expect(index).toContain('"constructor": {');
    expect(index).toContain('"toString": Blueprint.call({ errors })');
    expect(index).toContain('"valueOf": Blueprint.call({ errors })');
  });
});

describe("the client a plugin carries", () => {
  it("refuses NaN and Infinity as numbers, honours exclusive bounds, and substitutes {a-b} in a path", async () => {
    const { problems } = await import("./internal/runtime/json-schema.ts");
    const number = { type: "number" };
    expect(problems({}, number, Number.NaN)).not.toEqual([]);
    expect(problems({}, number, Number.POSITIVE_INFINITY)).not.toEqual([]);
    expect(problems({}, {}, Number.NaN)).not.toEqual([]);
    expect(problems({}, number, 1.5)).toEqual([]);
    expect(problems({}, { type: "integer", minimum: 1, exclusiveMinimum: true }, 1)).not.toEqual([]);
    expect(problems({}, { type: "integer", exclusiveMinimum: 1 }, 2)).toEqual([]);
    expect(problems({}, { type: "integer", exclusiveMaximum: 5 }, 5)).not.toEqual([]);
    const { makeClient } = await import("./internal/runtime/client.ts");
    const seen: Array<string> = [];
    const server = createServer((req, res) => { seen.push(String(req.url)); res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    const calls = makeClient([{ name: ["constructor", "toString"], method: "get", path: "/a/{x-y}", params: [{ name: "x-y", in: "path", required: true, schema: { type: "string" } }], successes: [] }], {}, { baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}` }).calls;
    await (calls["constructor"] as Record<string, (i: unknown) => Promise<unknown>>)["toString"]!({ "x-y": "q" });
    expect(seen).toEqual(["/a/q"]);
    server.closeAllConnections();
    server.close();
  });

  it("sends the request the description says, refuses a wrong input or answer, and fails with what the server said", async () => {
    const { makeClient } = await import("./internal/runtime/client.ts");
    const seen: Array<string> = [];
    const answers: Array<{ status: number; body: unknown }> = [{ status: 200, body: { id: "w-1" } }, { status: 200, body: { size: 1 } }, { status: 404, body: { message: "Not Found" } }];
    const server = createServer((req, res) => {
      seen.push(`${req.method} ${req.url} ${String(req.headers["authorization"])}`);
      const a = answers.shift()!;
      res.writeHead(a.status, { "content-type": "application/json" });
      res.end(JSON.stringify(a.body));
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    const port = (server.address() as { port: number }).port;
    const operations = [{ name: ["widgets", "getOne"], method: "get" as const, path: "/widgets/{id}", params: [{ name: "id", in: "path" as const, required: true, schema: { type: "string", pattern: "^w-\\d+$" } }], successes: [{ status: 200, schema: { $ref: "#/components/schemas/widget" } }] }];
    const calls = makeClient(operations, { "#/components/schemas/widget": spec.components.schemas.widget }, { baseUrl: `http://127.0.0.1:${port}`, token: "t" }).calls;
    const get = (calls["widgets"] as Record<string, (i?: unknown) => Promise<unknown>>)["getOne"]!;
    expect(await get({ id: "w-1" })).toEqual({ id: "w-1" });
    expect(seen).toEqual(["GET /widgets/w-1 Bearer t"]);
    await expect(get({ id: "nope" })).rejects.toMatchObject({ _tag: "InputRefused" });
    await expect(get({})).rejects.toMatchObject({ _tag: "InputRefused" });
    await expect(get({ id: "w-2" })).rejects.toMatchObject({ _tag: "AnswerRefused" });
    await expect(get({ id: "w-3" })).rejects.toMatchObject({ _tag: "ApiFailure", status: 404 });
    expect(seen).toHaveLength(3);
    server.closeAllConnections();
    server.close();
  });
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const dataOf = (spec: unknown) => JSON.parse(JSON.parse(/JSON\.parse\((".*")\) as/.exec(files(spec).find((f) => f.path === "src/spec/operations.ts")!.content)![1]!) as string) as ReadonlyArray<{ params: ReadonlyArray<{ name: string; in: string; schema: { maximum?: number } }>; successes: ReadonlyArray<{ status: number; schema: unknown }> }>;

describe("the runtime a plugin carries", () => {
  it("is embedded as text that is the runtime's own source, so a built package needs no source folder", () => {
    const sources = Object.fromEntries(RUNTIME_NAMES.map((n) => [n, read(`./internal/runtime/${n}.ts`)])) as Record<(typeof RUNTIME_NAMES)[number], string>;
    expect(read("./internal/runtime-sources.ts"), "run: node packages/generators/scripts/embed-runtime.ts").toBe(embeddedText(sources));
    expect(read("./internal/templates.ts")).not.toMatch(/node:fs|readFileSync/);
  });

  it("generates from the built output, where no runtime/*.ts is shipped", () => {
    const out = new URL("../../../tmp/adapter-dist/", import.meta.url).pathname;
    rmSync(out, { recursive: true, force: true });
    const root = new URL("../../", import.meta.url).pathname;
    const built = spawnSync("../../node_modules/.bin/tsc", ["--ignoreConfig", "--outDir", out, "--rootDir", root, "--module", "nodenext", "--moduleResolution", "nodenext", "--target", "es2024", "--rewriteRelativeImportExtensions", "--skipLibCheck", "--types", "node", `${root}modules/adapter/service.ts`], { cwd: new URL("../../../", import.meta.url).pathname, encoding: "utf8" });
    expect(built.status, built.stdout + built.stderr).toBe(0);
    const ran = spawnSync(process.execPath, ["--input-type=module", "-e", `import { Effect } from "effect"; import { Adapter } from ${JSON.stringify(`${out}modules/adapter/service.js`)};
      const r = await Effect.runPromise(Adapter.generate({ name: "w", spec: ${JSON.stringify(spec)} })); process.stdout.write(String(r.files.filter((f) => f.path.startsWith("src/runtime/")).length));`], { cwd: new URL("../../../", import.meta.url).pathname, encoding: "utf8" });
    rmSync(out, { recursive: true, force: true });
    expect(ran.stdout.trim(), ran.stderr).toBe("3");
  });
});

describe("what a description says of its parameters and answers", () => {
  const limit = (maximum: number) => ({ name: "limit", in: "query", schema: { type: "integer", maximum } });
  it("an operation's parameter overrides the path item's of the same name and place", () => {
    const spec = { openapi: "3.1.0", info: { title: "T", version: "1" }, paths: { "/x": { parameters: [limit(10)], get: { operationId: "list", parameters: [limit(100)], responses: { "200": { description: "ok" } } } } } };
    expect(dataOf(spec)[0]!.params.map((p) => [p.name, p.schema.maximum])).toEqual([["limit", 100]]);
  });

  it("keeps a schema for each documented 2xx status, none for one with no body", () => {
    const json = (type: string) => ({ content: { "application/json": { schema: { type } } } });
    const spec = { openapi: "3.1.0", info: { title: "T", version: "1" }, paths: { "/x": { post: { operationId: "make", responses: { "200": json("object"), "201": json("array"), "204": { description: "none" } } } } } };
    expect(dataOf(spec)[0]!.successes).toEqual([{ status: 200, schema: { type: "object" } }, { status: 201, schema: { type: "array" } }, { status: 204, schema: null }]);
  });

  it("the client chooses by the answer's status: a 204 takes an empty body, and 200 and 201 are judged by their own schemas", async () => {
    const { makeClient } = await import("./internal/runtime/client.ts");
    const answers: Array<{ status: number; body: string }> = [{ status: 204, body: "" }, { status: 200, body: "{}" }, { status: 201, body: "[]" }, { status: 201, body: "{}" }, { status: 202, body: "{}" }];
    const server = createServer((_, res) => { const a = answers.shift()!; res.writeHead(a.status, { "content-type": "application/json" }); res.end(a.body); });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    const op = { name: ["make"], method: "post" as const, path: "/x", params: [], successes: [{ status: 200, schema: { type: "object" } }, { status: 201, schema: { type: "array" } }, { status: 204, schema: null }] };
    const make = makeClient([op], {}, { baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}` }).calls["make"] as (i: unknown) => Promise<unknown>;
    expect(await make({})).toBeUndefined();
    expect(await make({})).toEqual({});
    expect(await make({})).toEqual([]);
    await expect(make({}), "201 is an array, not an object").rejects.toMatchObject({ _tag: "AnswerRefused" });
    await expect(make({}), "202 is not documented").rejects.toMatchObject({ _tag: "AnswerRefused" });
    server.closeAllConnections();
    server.close();
  });
});
