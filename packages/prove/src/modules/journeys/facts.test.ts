// What a deployed Worker needs and a local one does not: an https transport for the sign-up, a facts reader that is not the closed `/_world` door, and a D1 reader that never says a credential.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer as http, type RequestListener, type Server } from "node:http";
import { createServer as https } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { d1Facts } from "./internal/d1-facts.ts";
import { doorFacts, signUpPeople } from "./internal/world.ts";

const servers: Server[] = [];
const listen = (server: Server) => new Promise<number>((resolve) => { servers.push(server); server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port)); });
const scratch = mkdtempSync(join(tmpdir(), "ortho-facts-"));
afterAll(() => { for (const s of servers) { s.closeAllConnections(); s.close(); } rmSync(scratch, { recursive: true, force: true }); });
const body = (res: Parameters<RequestListener>[1], status: number, value: unknown) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));

describe("the sign-up transport follows the address's protocol", () => {
  it("signs a person up over https, as it does over http", async () => {
    const key = join(scratch, "key.pem"), cert = join(scratch, "cert.pem");
    spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-subj", "/CN=127.0.0.1", "-days", "1"], { stdio: "ignore" });
    const seen: string[] = [];
    const serve: RequestListener = (req, res) => { seen.push(req.url ?? ""); body(res, 200, req.url?.endsWith("sign-up/email") ? { user: { id: "u1" } } : { token: "t1" }); };
    const secure = await listen(https({ key: readFileSync(key), cert: readFileSync(cert) }, serve));
    const plain = await listen(http(serve));
    const previous = process.env["NODE_TLS_REJECT_UNAUTHORIZED"];
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    try {
      for (const url of [`https://127.0.0.1:${secure}`, `http://127.0.0.1:${plain}`]) {
        const cast = await Effect.runPromise(signUpPeople(url, ["ada"]));
        expect(cast["ada"]?.person).toBe("u1");
      }
    } finally {
      if (previous === undefined) delete process.env["NODE_TLS_REJECT_UNAUTHORIZED"]; else process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = previous;
    }
    expect(seen.filter((u) => u.endsWith("sign-in/email"))).toHaveLength(2);
  });
});

describe("facts from a Worker that closes /_world", () => {
  it("a 404 from the door is one clear line, not a cast of its body", async () => {
    const port = await listen(http((_req, res) => body(res, 404, { error: "not a door the world has" })));
    const url = `http://127.0.0.1:${port}`;
    const said = (e: Effect.Effect<unknown>) => Effect.runPromise(Effect.exit(e)).then((x) => (x._tag === "Success" ? "it answered" : String(x.cause)));
    for (const message of [await said(doorFacts(url).journal("abc")), await said(doorFacts(url).record("link", "1"))]) {
      expect(message).toContain(`${url} answered 404`);
      expect(message).toContain("CLOUDFLARE_API_TOKEN");
    }
  });
});

describe("facts from the run's D1 databases", () => {
  const TOKEN = "tok-secret-1234", ACCOUNT = "acct-secret-5678";
  const fake = async (fail = false) => {
    const asked: Array<{ path: string; auth: string | undefined; sql?: string }> = [];
    const port = await listen(http((req, res) => {
      let text = "";
      req.on("data", (c: Buffer) => (text += c));
      req.on("end", () => {
        const sql = text === "" ? undefined : (JSON.parse(text) as { sql: string }).sql;
        asked.push({ path: req.url ?? "", auth: req.headers.authorization, ...(sql === undefined ? {} : { sql }) });
        if (fail) return body(res, 400, { success: false, errors: [{ message: `bad token ${TOKEN} for ${ACCOUNT}` }] });
        if (req.method === "GET") return body(res, 200, { success: true, result: [{ uuid: "db-1", name: "ortho-p-stg-r1-db" }, { uuid: "db-2", name: "ortho-p-stg-r1-db-ledger" }, { uuid: "db-x", name: "other-db" }] });
        if (req.url?.includes("db-2")) return body(res, 200, { success: false, errors: [{ message: "no such table: link" }] });
        return body(res, 200, { success: true, result: [{ results: sql?.includes("_journal") ? [{ seq: 1, trace: "t", fields: "{\"a\":1}" }] : [{ id: "1", handle: "ada" }] }] });
      });
    }));
    return { asked, api: `http://127.0.0.1:${port}` };
  };
  const access = (api: string) => ({ token: TOKEN, account: ACCOUNT, api, owns: (n: string) => n === "ortho-p-stg-r1-db" || n.startsWith("ortho-p-stg-r1-db-") });

  it("reads a record and a trace's journal from the databases the prefix owns, with the credential, and no other", async () => {
    const { asked, api } = await fake();
    const facts = d1Facts(access(api));
    expect(await Effect.runPromise(facts.record("link", "1"))).toEqual({ id: "1", handle: "ada" });
    expect(await Effect.runPromise(facts.journal("t"))).toEqual([{ seq: 1, trace: "t", fields: { a: 1 } }]);
    expect(asked.every((a) => a.auth === `Bearer ${TOKEN}`)).toBe(true);
    expect(asked.some((a) => a.path.includes("db-x"))).toBe(false);
    expect(asked.filter((a) => a.sql !== undefined).map((a) => a.path)).toContain(`/accounts/${ACCOUNT}/d1/database/db-2/query`);
  });

  it("finds the run's databases past the first page, and merges one trace's journal across them in order", async () => {
    const asked: string[] = [];
    const others = Array.from({ length: 100 }, (_, i) => ({ uuid: `other-${i}`, name: `someone-else-${i}` }));
    const port = await listen(http((req, res) => {
      let text = "";
      req.on("data", (c: Buffer) => (text += c));
      req.on("end", () => {
        asked.push(req.url ?? "");
        if (req.method === "GET") return body(res, 200, { success: true, result: req.url?.includes("&page=1") ? others : [{ uuid: "db-1", name: "ortho-p-stg-r1-db" }, { uuid: "db-2", name: "ortho-p-stg-r1-db-ledger" }] });
        const sql = (JSON.parse(text) as { sql: string }).sql;
        if (!sql.includes("_journal")) return body(res, 200, { success: true, result: [{ results: req.url?.includes("db-2") ? [{ id: "1", handle: "ada" }] : [] }] });
        return body(res, 200, { success: true, result: [{ results: req.url?.includes("db-1") ? [{ seq: 3, trace: "t", fields: "{}" }] : [{ seq: 1, trace: "t", fields: "{}" }, { seq: 2, trace: "t", fields: "{}" }] }] });
      });
    }));
    const facts = d1Facts(access(`http://127.0.0.1:${port}`));
    expect(await Effect.runPromise(facts.record("link", "1"))).toEqual({ id: "1", handle: "ada" });
    expect((await Effect.runPromise(facts.journal("t"))).map((r) => (r as unknown as { seq: number }).seq)).toEqual([1, 2, 3]);
    expect(asked.filter((u) => u.includes("&page=2")).length).toBeGreaterThan(0);
    expect(asked.some((u) => u.includes("other-"))).toBe(false);
  });

  it("an error from the API reaches the run without the token or the account", async () => {
    const { api } = await fake(true);
    const message = await Effect.runPromise(d1Facts(access(api)).record("link", "1").pipe(Effect.exit)).then((x) => String(x));
    expect(message).toContain("reading the databases from D1 failed");
    expect(message).not.toContain(TOKEN);
    expect(message).not.toContain(ACCOUNT);
    expect(message).toContain("[token]");
  });
});
