// The generator on a small description: the names, the files, the refusals, and the client it makes, run against a probe.
import { Effect } from "effect";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { Adapter } from "./service.ts";
import { camel, nameParts } from "./internal/names.ts";

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

describe("the client a plugin carries", () => {
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
    const operations = [{ name: ["widgets", "getOne"], method: "get" as const, path: "/widgets/{id}", params: [{ name: "id", in: "path" as const, required: true, schema: { type: "string", pattern: "^w-\\d+$" } }], success: { status: 200, schema: { $ref: "#/components/schemas/widget" } } }];
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
