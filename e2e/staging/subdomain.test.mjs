// Run by `nx run e2e:test` (node --test): `subdomain.mjs` against a fake account served from this machine. No cloud, no real credential.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

const TOKEN = "tok-never-printed-0123456789", ACCOUNT = "acct0123456789abcdef", SECRET = "response-body-never-printed";
const serve = (status, body) => new Promise((resolve) => {
  const seen = [];
  const server = createServer((req, res) => { seen.push({ url: req.url, auth: req.headers.authorization }); res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body)); });
  server.listen(0, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${server.address().port}`, seen, close: () => server.close() }));
});
const run = async (fake, env = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "subdomain-"));
  const out = join(dir, "output");
  const child = spawn(process.execPath, [join(import.meta.dirname, "subdomain.mjs"), out], { env: { PATH: process.env.PATH, CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, ORTHO_STAGING_API: fake.base, ...env } });
  let said = "";
  child.stdout.on("data", (d) => { said += d; });
  child.stderr.on("data", (d) => { said += d; });
  const status = await new Promise((r) => child.on("close", r));
  let written;
  try { written = readFileSync(out, "utf8"); } catch { written = undefined; }
  rmSync(dir, { recursive: true, force: true });
  return { status, said, written };
};

describe("subdomain.mjs", () => {
  test("reads the account's subdomain with the token and writes only subdomain=<name>", async () => {
    const fake = await serve(200, { success: true, result: { subdomain: "acme-account" }, extra: SECRET });
    const r = await run(fake);
    fake.close();
    assert.deepEqual([r.status, r.written, r.said], [0, "subdomain=acme-account\n", ""]);
    assert.deepEqual(fake.seen, [{ url: `/client/v4/accounts/${ACCOUNT}/workers/subdomain`, auth: `Bearer ${TOKEN}` }]);
  });
  const refused = [
    ["a name with upper case", 200, { result: { subdomain: "Acme" } }],
    ["a name with a dot", 200, { result: { subdomain: "a.b" } }],
    ["a name of 64 characters", 200, { result: { subdomain: "a".repeat(64) } }],
    ["an empty name", 200, { result: { subdomain: "" } }],
    ["a name that is not text", 200, { result: { subdomain: 5 } }],
    ["a name with a newline (it would add a second output line)", 200, { result: { subdomain: "a\nb=c" } }],
    ["no subdomain registered", 200, { result: { subdomain: null }, secret: SECRET }],
    ["an error answer", 403, { errors: [{ message: SECRET }] }],
  ];
  for (const [name, status, body] of refused) {
    test(`${name}: exit 2, nothing written, neither the token nor the response said`, async () => {
      const fake = await serve(status, body);
      const r = await run(fake);
      fake.close();
      assert.equal(r.status, 2);
      assert.equal(r.written, undefined);
      assert.ok(!r.said.includes(TOKEN) && !r.said.includes(SECRET), r.said);
    });
  }
  test("a missing token is refused", async () => {
    const fake = await serve(200, { result: { subdomain: "x" } });
    const r = await run(fake, { CLOUDFLARE_API_TOKEN: "" });
    fake.close();
    assert.deepEqual([r.status, r.written], [2, undefined]);
  });
  test("an address that is not this machine is refused", async () => {
    const r = await run({ base: "http://example.com" });
    assert.deepEqual([r.status, r.written], [2, undefined]);
  });
});
