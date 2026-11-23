// K19: the server half. The data API over a logbook in memory, and the client's static files from an assets binding. It draws no page.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeLogbook } from "#modules/reader/testing.js";
import { acmeModel, blueprintOf, withBudget } from "#modules/wire/testing.js";
import { PortalServer } from "./service.ts";
import type { PortalAssets } from "./types.ts";

const model = acmeModel();
const blueprint = blueprintOf(model);
const ops = Object.keys(model.operations);

const book = () => {
  const b = fakeLogbook();
  b.keep("r1", model);
  for (const environment of ["test", "staging", "production"]) for (const operation of ops) b.post({ revision: "r1", environment, operation, verdict: "pass" });
  return b;
};
const get = (path: string, reader: ReturnType<typeof fakeLogbook> | null = book(), init?: RequestInit) =>
  Effect.runPromise(PortalServer.handle({ blueprint, reader, bundleRevision: "r1" }, new Request(`http://portal${path}`, init)));
const proofs = async (path: string, reader?: ReturnType<typeof fakeLogbook> | null) =>
  ((await (await get(path, reader)).json()) as { proofs: ReadonlyArray<{ operation: string; environment: string; state: string }> }).proofs;
const state = (all: Awaited<ReturnType<typeof proofs>>, operation: string, environment: string) => all.find((p) => p.operation === operation && p.environment === environment)?.state;

describe("/_portal/v1/snapshot: what the client draws its ticks from", () => {
  const url = `/_portal/v1/snapshot?digest=${blueprint.digest}`;

  it("a recorded pass in every environment, for every operation", async () => {
    const all = await proofs(url);
    for (const op of ops) for (const environment of ["test", "staging", "production"]) expect(state(all, op, environment), `${op} ${environment}`).toBe("recorded-pass");
  });

  it("after a budget edit, spend is stale in the environments that have not re-proved it, and no other operation is", async () => {
    const b = book();
    b.keep("r2", withBudget(model, "allowance.spend", 120));
    for (const op of ops) b.post({ revision: "r2", environment: "test", operation: op, verdict: "pass" });
    const all = await proofs(url, b);
    expect(state(all, "allowance.spend", "test")).toBe("recorded-pass");
    expect(state(all, "allowance.spend", "staging")).toBe("stale");
    expect(state(all, "allowance.spend", "production")).toBe("stale");
    expect(all.filter((p) => p.state === "stale" && p.operation !== "allowance.spend")).toEqual([]);
    expect(JSON.stringify(all.find((p) => p.operation === "allowance.spend" && p.environment === "staging"))).toContain("operation:allowance.spend");
  });

  it("with the logbook down, no proof is a tick, and the snapshot says why", async () => {
    const b = book();
    b.down = true;
    const response = await get(url, b);
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ consistency: "unavailable" });
    expect(JSON.parse(text).proofs.filter((p: { state: string }) => p.state === "recorded-pass")).toEqual([]);
    expect(text).toMatch(/logbook/i);
  });

  it("with no logbook configured, no proof is a tick", async () => {
    const all = await proofs(url, null);
    expect(all.filter((p) => p.state === "recorded-pass")).toEqual([]);
    expect(JSON.stringify(all)).toContain("no logbook");
  });

  it("a failure is a failure, with no pass for that environment", async () => {
    const b = book();
    b.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "fail" });
    const all = await proofs(url, b);
    expect([state(all, "allowance.spend", "test"), state(all, "allowance.spend", "staging"), state(all, "allowance.spend", "production")]).toEqual(["recorded-pass", "failed", "recorded-pass"]);
  });
});

describe("/_portal/v1", () => {
  it("blueprint: the validated JSON, ETag the digest, 304 when the reader has it", async () => {
    const response = await get("/_portal/v1/blueprint");
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`"${blueprint.digest}"`);
    expect(await response.json()).toMatchObject({ schemaVersion: 1, digest: blueprint.digest });
    expect((await get("/_portal/v1/blueprint", book(), { headers: { "if-none-match": `"${blueprint.digest}"` } })).status).toBe(304);
  });

  it("snapshot: for exactly that digest, never cached", async () => {
    const response = await get(`/_portal/v1/snapshot?digest=${blueprint.digest}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ schemaVersion: 1, blueprintDigest: blueprint.digest, consistency: "checked" });
  });

  it("snapshot: a different digest is 409 BlueprintChanged, and no digest is a 400", async () => {
    const changed = await get(`/_portal/v1/snapshot?digest=${"0".repeat(64)}`);
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({ _tag: "BlueprintChanged" });
    expect((await get("/_portal/v1/snapshot")).status).toBe(400);
  });

  it("unknown routes are JSON 404s, `handle` answers nothing outside `/_portal/`, and only GET and HEAD are answered", async () => {
    const missing = await get("/_portal/v1/traces/abc?environment=staging");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toContain("json");
    expect((await get("/_portal/v2/blueprint")).status).toBe(404);
    expect((await get("/portal")).status).toBe(404);
    expect((await get("/elsewhere")).status).toBe(404);
    expect((await get("/_portal/v1/blueprint", book(), { method: "DELETE" })).status).toBe(405);
  });
});

/** An assets binding over a few files, answering the way Workers static assets do: the file, or a 404. */
const assets = (files: Readonly<Record<string, string>>): PortalAssets & { readonly asked: Array<string> } => {
  const asked: Array<string> = [];
  return {
    asked,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      asked.push(path);
      const body = files[path === "/" ? "/index.html" : path];
      return Promise.resolve(body === undefined ? new Response("no", { status: 404 }) : new Response(body, { status: 200, headers: { "content-type": path.endsWith(".js") ? "text/javascript" : "text/html" } }));
    },
  };
};

describe("`serve`: a Worker's route", () => {
  const json = JSON.parse(JSON.stringify(blueprint)) as unknown;
  const serve = (path: string, env: Parameters<typeof PortalServer.serve>[2], init?: RequestInit) =>
    Effect.runPromise(PortalServer.serve(json, new Request(`http://portal${path}`, init), env));

  it("`/portal` and a route under it are the client's shell; a file of the client is that file, and a missing file is a 404, not the shell", async () => {
    const files = assets({ "/index.html": "<!doctype html>shell", "/assets/app.js": "export {}" });
    expect(await (await serve("/portal", { PORTAL_ASSETS: files })).text()).toBe("<!doctype html>shell");
    expect(await (await serve("/portal/operations/allowance.spend", { PORTAL_ASSETS: files })).text()).toBe("<!doctype html>shell");
    expect(await (await serve("/portal/assets/app.js", { PORTAL_ASSETS: files })).text()).toBe("export {}");
    expect((await serve("/portal/assets/missing.js", { PORTAL_ASSETS: files })).status).toBe(404);
  });

  it("a route whose last segment looks like a file type is still a route: an operation whose verb is `map`, `json` or `svg` is the shell", async () => {
    const files = assets({ "/index.html": "<!doctype html>shell", "/assets/app.js": "export {}" });
    for (const verb of ["map", "json", "svg", "js", "css"]) {
      expect(await (await serve(`/portal/operations/document.${verb}`, { PORTAL_ASSETS: files })).text(), verb).toBe("<!doctype html>shell");
    }
    expect((await serve("/portal/assets/app.map", { PORTAL_ASSETS: files })).status, "a file of the client's namespace that is not there is a 404").toBe(404);
  });

  it("a Worker with no assets says the client is not installed, and still answers the data", async () => {
    const response = await serve("/portal", {});
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("not installed");
    expect((await serve("/_portal/v1/blueprint", {})).status).toBe(200);
  });

  it("only GET and HEAD are answered", async () => {
    expect((await serve("/portal", { PORTAL_ASSETS: assets({}) }, { method: "POST", body: "{}" })).status).toBe(405);
    expect((await serve("/_portal/v1/blueprint", {}, { method: "DELETE" })).status).toBe(405);
  });

  it("an unknown schema version or a wrong digest is a 500 with the reason, on the data and on the page", async () => {
    for (const bad of [{ ...blueprint, schemaVersion: 2 }, { ...blueprint, digest: "0".repeat(64) }]) {
      for (const path of ["/portal", "/_portal/v1/blueprint"]) {
        const response = await Effect.runPromise(PortalServer.serve(bad, new Request(`http://portal${path}`), {}));
        expect(response.status, path).toBe(500);
        expect(await response.text()).not.toContain("✔");
      }
    }
  });

  it("a blueprint that is fine, over a logbook that does not answer, has nothing green", async () => {
    const response = await serve(`/_portal/v1/snapshot?digest=${blueprint.digest}`, { ORTHO_LOGBOOK_URL: "http://127.0.0.1:1" });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("recorded-pass");
  });
});
