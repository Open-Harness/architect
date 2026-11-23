// A stand-in for Bridge (https://api.bridge.xyz/v0), for the calls Capxul needs first: customers, KYC links, virtual
// accounts and transfers. Every answer is one of the examples Bridge's own description publishes, with fresh ids and the
// caller's fields put in, so what the stand-in says is what Bridge documents. It keeps Bridge's two header rules: no
// `Api-Key`, 401; a POST without `Idempotency-Key`, 400; the same key again, the first answer again.
// Usage: node stand-in.mjs <bridge.json> <port>. `POST /__stand-in/mode {"mode": ...}` sets how it answers: `published`
// (the default: Bridge's examples as published), `repaired` (the same, made to fit Bridge's own schemas, which several of
// its examples don't), or `misfit` (an `id` that is a number, to prove the client refuses an answer that breaks the schema).
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const [specPath, port] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const at = (ref) => ref.replace(/^#\//, "").split("/").reduce((n, k) => n?.[k.replace(/~1/g, "/")], spec);

/** The examples the description gives for one answer, by name, `$ref`s followed. */
const examples = (path, method, status) => {
  const content = spec.paths[path][method].responses[status].content["application/json"];
  return Object.fromEntries(Object.entries(content.examples ?? {}).map(([k, e]) => [k, structuredClone((e.$ref ? at(e.$ref) : e).value)]));
};
const example = (path, method, status, name) => {
  const all = examples(path, method, status);
  return structuredClone(all[name] ?? Object.values(all)[0]);
};

const customers = new Map(); const kycLinks = new Map(); const transfers = new Map(); const replies = new Map();
let mode = "published";
const log = [];

const routes = [
  ["POST", /^\/v0\/customers$/, (body) => {
    const c = example("/customers", "post", "201", body.type === "business" ? "BusinessCustomerCreated" : "IndividualCustomerCreated");
    Object.assign(c, { id: randomUUID(), ...(body.email ? { email: body.email } : {}) });
    customers.set(c.id, c);
    return [201, c];
  }],
  ["GET", /^\/v0\/customers\/([^/]+)$/, (_, [id]) => (customers.has(id) ? [200, customers.get(id)] : [404, { code: "not_found", message: "Customer not found" }])],
  ["POST", /^\/v0\/kyc_links$/, (body) => {
    if (!body.email || !body.type) return [400, { code: "bad_request", message: "email and type are required" }];
    const customer = { ...example("/customers/{customerID}", "get", "200", "SuccessfulCustomerResponse"), id: randomUUID(), email: body.email, type: body.type };
    customers.set(customer.id, customer);
    const link = { ...example("/kyc_links", "post", "200"), id: randomUUID(), customer_id: customer.id, email: body.email, type: body.type, full_name: body.full_name ?? "", kyc_status: "not_started", tos_status: "pending" };
    kycLinks.set(link.id, link);
    return [200, link];
  }],
  ["GET", /^\/v0\/kyc_links\/([^/]+)$/, (_, [id]) => (kycLinks.has(id) ? [200, kycLinks.get(id)] : [404, { code: "not_found", message: "KYC link not found" }])],
  ["POST", /^\/v0\/customers\/([^/]+)\/virtual_accounts$/, (body, [customer]) => {
    if (!customers.has(customer)) return [404, { code: "not_found", message: "Customer not found" }];
    const account = { ...example("/customers/{customerID}/virtual_accounts", "post", "200", "us"), id: randomUUID(), customer_id: customer, destination: body.destination };
    return [200, account];
  }],
  ["POST", /^\/v0\/transfers$/, (body) => {
    if (!customers.has(body.on_behalf_of)) return [400, { code: "bad_request", message: "on_behalf_of is not a customer" }];
    const t = { ...example("/transfers", "post", "201", "AchOnrampTransferResponse"), id: randomUUID(), on_behalf_of: body.on_behalf_of, amount: body.amount };
    transfers.set(t.id, t);
    return [201, t];
  }],
  ["GET", /^\/v0\/transfers\/([^/]+)$/, (_, [id]) => (transfers.has(id) ? [200, transfers.get(id)] : [404, { code: "not_found", message: "Transfer not found" }])],
];

/** Bridge's examples made to fit Bridge's schemas: a transfer's required `currency`, and its receipt's `<amount>_currency`
 * beside each amount, which no transfer example has; an endorsement's `requirements.missing`, an object its examples give
 * as null. */
const repaired = (body) => {
  const out = structuredClone(body);
  const currency = out.source?.currency ?? "usd";
  if ("on_behalf_of" in out && out.currency === undefined) out.currency = currency;
  for (const k of Object.keys(out.receipt ?? {})) if (/(amount|fee)$/.test(k) && out.receipt[`${k}_currency`] === undefined) out.receipt[`${k}_currency`] = currency;
  for (const e of out.endorsements ?? []) if (e.requirements?.missing === null) e.requirements.missing = {};
  return out;
};

const answer = (req, text) => {
  const url = new URL(req.url, "http://stand-in");
  if (url.pathname === "/__stand-in/mode") { mode = JSON.parse(text).mode; return [200, { mode }]; }
  if (url.pathname === "/__stand-in/log") return [200, log];
  log.push({ method: req.method, path: url.pathname + url.search, apiKey: req.headers["api-key"] !== undefined, idempotencyKey: req.headers["idempotency-key"] ?? null, authorization: req.headers.authorization !== undefined });
  if (req.headers["api-key"] === undefined) return [401, { code: "required", message: "Missing Api-Key header" }];
  const key = req.headers["idempotency-key"];
  if (req.method === "POST" && key === undefined) return [400, { code: "bad_request", message: "Idempotency-Key header is required" }];
  if (req.method === "POST" && replies.has(key)) return replies.get(key);
  const route = routes.find(([m, re]) => m === req.method && re.test(url.pathname));
  if (route === undefined) return [404, { code: "not_found", message: `the stand-in has no ${req.method} ${url.pathname}` }];
  const [status, body] = route[2](text === "" ? {} : JSON.parse(text), url.pathname.match(route[1]).slice(1));
  const out = [status, status >= 300 ? body : mode === "misfit" ? { ...repaired(body), id: 42 } : mode === "repaired" ? repaired(body) : body];
  if (req.method === "POST") replies.set(key, out);
  return out;
};

createServer((req, res) => {
  let text = "";
  req.on("data", (c) => { text += c; });
  req.on("end", () => {
    const [status, body] = answer(req, text);
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  });
}).listen(Number(port), "127.0.0.1", () => console.log(`bridge stand-in on http://127.0.0.1:${port}/v0`));
