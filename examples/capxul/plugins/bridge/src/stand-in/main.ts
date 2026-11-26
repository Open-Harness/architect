// Scaffolded from ortho new adapter. Yours from now on.
// Bridge's stand-in: a small server that speaks the part of Bridge's API Capxul calls, under `/v0`, and sends Bridge's
// signed webhooks. `node main.ts --port 0 --dir <state folder> [--deliver-to <url>]`; it prints `stand-in listening on
// <url>` and stops on SIGTERM. This file is the process's entry: the only one here that reads the process, the clock,
// the random source, prints or exits.
//
// Its control routes, for a journey once a step can reach a stand-in (#995, gap 3):
//   GET  /_stand/issued                       what it issued: KYC links, virtual accounts (their deposit instructions), transfers and their keys
//   GET  /_stand/webhook-key                  the PEM public key its webhooks verify with (Bridge gives one per endpoint)
//   POST /_stand/decide   { kycLink, status, reason? }        Bridge's KYC or KYB decision, then a signed `kyc_link` event
//   POST /_stand/deposit  { virtualAccount, amount, sender }  a deposit's three `virtual_account.activity` events, signed
//   POST /_stand/move     { transfer, state }                 a transfer's state, then a signed `transfer` event
//   POST /_stand/again    { signed?: "wrongly" | "late" }     the last delivery again: as it was, signed with another key, or eleven minutes old
import { createHash, createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { createWorld, type Reply } from "./world.ts";
import { depositActivity, envelope, signatureHeader, type Envelope } from "./webhooks.ts";

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

const dir = flag("dir");
if (dir === undefined) {
  process.stderr.write("usage: node main.ts --port 0 --dir <state folder> [--deliver-to <url>]\n");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });
const deliverTo = flag("deliver-to");

const random = () => randomBytes(16).toString("hex");
const world = createWorld({ now: () => Date.now(), random, saved: (state) => writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2)) });

// The endpoint's key, and another for a delivery signed wrongly.
const keyPair = () => generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const endpoint = keyPair();
const stranger = keyPair();
const signer = (privateKey: string) => (signed: string) => createSign("sha256").update(createHash("sha256").update(signed).digest()).sign(privateKey, "base64");

let sequence = 0;
let last: { body: string } | undefined;
const deliver = async (body: string, at: number, key: string): Promise<number> => {
  last = { body };
  if (deliverTo === undefined) return 0;
  const response = await fetch(deliverTo, { method: "POST", headers: { "content-type": "application/json", "x-webhook-signature": signatureHeader(body, at, signer(key)) }, body });
  return response.status;
};
const send = (category: Envelope["event_category"], mutation: string, object: Envelope["event_object"], status?: string) =>
  deliver(JSON.stringify(envelope({ id: `wh_${random()}`, developer: "dev_capxul", sequence: ++sequence, category, mutation, object, ...(status === undefined ? {} : { status }), at: Date.now() })), Date.now(), endpoint.privateKey);

const control = async (path: string, fields: Record<string, unknown>): Promise<Reply> => {
  if (path === "/_stand/issued") return { status: 200, body: world.issued() };
  if (path === "/_stand/webhook-key") return { status: 200, body: { public_key: endpoint.publicKey } };
  if (path === "/_stand/decide") {
    const reply = world.decide(String(fields["kycLink"]), fields["status"] === "rejected" ? "rejected" : "approved", typeof fields["reason"] === "string" ? fields["reason"] : undefined);
    if (reply.status !== 200) return reply;
    const link = reply.body as Envelope["event_object"];
    return { status: 200, body: { delivered: await send("kyc_link", "updated.status_transitioned", link, String(link["kyc_status"])) } };
  }
  if (path === "/_stand/deposit") {
    const account = world.issued().virtualAccounts.find((a) => a.id === fields["virtualAccount"]);
    if (account === undefined) return { status: 404, body: { code: "not_found" } };
    const objects = depositActivity({ ids: [random(), random(), random()], depositId: `dep_${random()}`, customer: account.customer_id, virtualAccount: account.id, currency: String(account.source_deposit_instructions["currency"]), amount: String(fields["amount"]), sender: String(fields["sender"]), at: Date.now() });
    const delivered: Array<number> = [];
    for (const object of objects) delivered.push(await send("virtual_account.activity", "created", object));
    return { status: 200, body: { depositId: objects[0]!["deposit_id"], delivered } };
  }
  if (path === "/_stand/move") {
    const reply = world.move(String(fields["transfer"]), String(fields["state"]));
    if (reply.status !== 200) return reply;
    const transfer = reply.body as Envelope["event_object"];
    return { status: 200, body: { delivered: await send("transfer", "updated.status_transitioned", transfer, String(transfer["state"])) } };
  }
  if (path === "/_stand/again") {
    if (last === undefined) return { status: 409, body: { code: "nothing_sent" } };
    const late = fields["signed"] === "late";
    return { status: 200, body: { delivered: await deliver(last.body, Date.now() - (late ? 11 * 60_000 : 0), fields["signed"] === "wrongly" ? stranger.privateKey : endpoint.privateKey) } };
  }
  return { status: 404, body: { code: "not_found" } };
};

const server = createServer((req, res) => {
  const chunks: Array<Buffer> = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", async () => {
    const url = new URL(req.url ?? "/", "http://stand-in");
    const text = Buffer.concat(chunks).toString("utf8");
    const header = (name: string) => { const v = req.headers[name]; return Array.isArray(v) ? v[0] : v; };
    let reply: Reply;
    try {
      reply = url.pathname.startsWith("/_stand/")
        ? await control(url.pathname, text === "" ? {} : (JSON.parse(text) as Record<string, unknown>))
        : world.handle({ method: req.method ?? "GET", path: url.pathname, apiKey: header("api-key"), idempotencyKey: header("idempotency-key"), body: text === "" ? undefined : text });
    } catch {
      reply = { status: 400, body: { code: "invalid_json", message: "the body is not JSON" } };
    }
    res.writeHead(reply.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(reply.body));
  });
});

server.listen(Number(flag("port") ?? 0), "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`stand-in listening on http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}\n`);
});

process.on("SIGTERM", () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
