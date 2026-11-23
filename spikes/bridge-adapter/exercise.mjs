// Exercises the generated Bridge client against the stand-in: Capxul's first flow (a KYC link, which makes the customer;
// the customer; a virtual account; a transfer), and the ways it should break. Each check says what it expects and what
// happened, and the run fails if any check is not as expected.
// Usage: node exercise.mjs <plugins/bridge/src/client.ts> <stand-in origin, like http://127.0.0.1:4010>
import { randomUUID } from "node:crypto";

const [clientPath, origin] = process.argv.slice(2);
const { client } = await import(clientPath);
const baseUrl = `${origin}/v0`;
const results = [];
const plainFetch = globalThis.fetch;
const standIn = (path, body) => plainFetch(`${origin}/__stand-in/${path}`, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());

/** Runs a call and reduces what came back to one line: `ok`, or the failure's tag with its status or first problem. */
const outcome = (promise) => promise.then(
  (value) => ({ tag: "ok", value }),
  (e) => ({ tag: e?._tag ?? "thrown", line: e?._tag === "ApiFailure" ? `${e.status} ${JSON.stringify(e.body)}` : (e?.problems ?? [String(e)]).join("; ") }),
);
const check = async (name, expected, promise) => {
  const got = await outcome(promise);
  results.push({ check: name, expected, got: got.tag, detail: got.line ?? "", pass: got.tag === expected });
  return got.value;
};

/** What the generator would have to do for Bridge: its key as `Api-Key`, and a fresh `Idempotency-Key` on each POST. */
const bridgeHeaders = (fixedKey) => (url, init) => {
  const headers = { ...init.headers };
  const token = headers.authorization?.replace(/^Bearer /, "");
  delete headers.authorization;
  if (token !== undefined) headers["api-key"] = token;
  if (init.method === "POST") headers["idempotency-key"] = fixedKey ?? randomUUID();
  return plainFetch(url, { ...init, headers });
};

const kycInput = { email: "ada@example.com", type: "individual", full_name: "Ada Lovelace" };
const destination = { currency: "usdc", payment_rail: "base", address: "0x00000000000000000000000000000000000000aa" };

// 1. The client as generated: the key goes as a bearer token, and Bridge wants it as `Api-Key`.
const asGenerated = client({ baseUrl, token: "sk-test-stand-in" }).calls;
await check("as generated: a KYC link (key sent as a bearer token)", "ApiFailure", asGenerated.kycLinks.generateLinksNeedsCompleteKycIndividualOrBusiness(kycInput));
await check("as generated: Idempotency-Key can't be given as a field", "InputRefused", asGenerated.kycLinks.generateLinksNeedsCompleteKycIndividualOrBusiness({ ...kycInput, "Idempotency-Key": "k1" }));

// 2. The same client, with Bridge's two headers added under it.
globalThis.fetch = bridgeHeaders();
const bridge = client({ baseUrl, token: "sk-test-stand-in" }).calls;
await check("customers.createCustomer: its body is a oneOf, so it has no fields", "InputRefused", bridge.customers.createCustomer({ type: "individual", email: "ada@example.com" }));
const link = await check("kycLinks: a KYC link, which makes the customer", "ok", bridge.kycLinks.generateLinksNeedsCompleteKycIndividualOrBusiness(kycInput));
await check("kycLinks: the link's status", "ok", bridge.kycLinks.checkStatusKycLink({ kycLinkID: link?.id }));
const account = await check("virtualAccounts: a USD account that lands as USDC on Base", "ok", bridge.virtualAccounts.createVirtualAccount({ customerID: link?.customer_id, source: { currency: "usd" }, destination }));
// Bridge's own examples break Bridge's own schemas here, so an answer shaped like them is refused.
await check("customers: the customer, answered as Bridge's example (missing: null)", "AnswerRefused", bridge.customers.getSingleCustomerObject({ customerID: link?.customer_id }));
await check("transfers: a transfer, answered as Bridge's example (no currency)", "AnswerRefused", bridge.transfers.createTransfer({ on_behalf_of: link?.customer_id, amount: "10.0", source: { currency: "usd", payment_rail: "ach_push" }, destination }));
await standIn("mode", { mode: "repaired" });
await check("customers: the customer, answered to fit the schema", "ok", bridge.customers.getSingleCustomerObject({ customerID: link?.customer_id }));
const transfer = await check("transfers: 10 USD from ACH to USDC, answered to fit the schema", "ok", bridge.transfers.createTransfer({ on_behalf_of: link?.customer_id, amount: "10.0", source: { currency: "usd", payment_rail: "ach_push" }, destination }));
await check("transfers: the transfer read back", "ok", bridge.transfers.getTransfer({ transferID: transfer?.id }));

// 3. Trying to break it.
const before = (await standIn("log")).length;
await check("refused before sending: a customer type Bridge doesn't have", "InputRefused", bridge.kycLinks.generateLinksNeedsCompleteKycIndividualOrBusiness({ ...kycInput, type: "robot" }));
await check("refused before sending: a transfer with no destination", "InputRefused", bridge.transfers.createTransfer({ on_behalf_of: link?.customer_id, amount: "10.0", source: { currency: "usd", payment_rail: "ach_push" } }));
await check("refused before sending: a field Bridge doesn't have", "InputRefused", bridge.transfers.getTransfer({ transferID: "x", expand: "all" }));
const sentWhileRefusing = (await standIn("log")).length - before;
results.push({ check: "nothing reached the stand-in for the three refusals", expected: 0, got: sentWhileRefusing, detail: "", pass: sentWhileRefusing === 0 });
await check("a transfer that doesn't exist: 404 as ApiFailure", "ApiFailure", bridge.transfers.getTransfer({ transferID: randomUUID() }));
await check("a virtual account for a customer that doesn't exist", "ApiFailure", bridge.virtualAccounts.createVirtualAccount({ customerID: randomUUID(), source: { currency: "usd" }, destination }));
await standIn("mode", { mode: "misfit" });
await check("an answer that breaks Bridge's schema (id a number) is refused", "AnswerRefused", bridge.transfers.getTransfer({ transferID: transfer?.id }));
await standIn("mode", { mode: "repaired" });

// 4. A retry with the same Idempotency-Key gets the first answer, so a retried transfer is not sent twice.
globalThis.fetch = bridgeHeaders("retry-1");
const retrying = client({ baseUrl, token: "sk-test-stand-in" }).calls;
const first = await check("a transfer, first try", "ok", retrying.transfers.createTransfer({ on_behalf_of: link?.customer_id, amount: "5.0", source: { currency: "usd", payment_rail: "ach_push" }, destination }));
const again = await check("the same transfer, retried with the same key", "ok", retrying.transfers.createTransfer({ on_behalf_of: link?.customer_id, amount: "5.0", source: { currency: "usd", payment_rail: "ach_push" }, destination }));
results.push({ check: "the retry is the same transfer", expected: true, got: first?.id === again?.id, detail: first?.id ?? "", pass: first?.id !== undefined && first?.id === again?.id });

const asSent = (await standIn("log")).slice(0, 2);
results.push({ check: "as generated, the request carried no Api-Key and no Idempotency-Key", expected: true, got: !asSent[0].apiKey && asSent[0].idempotencyKey === null && asSent[0].authorization, detail: JSON.stringify(asSent[0]), pass: !asSent[0].apiKey && asSent[0].idempotencyKey === null });

for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.check}: expected ${r.expected}, got ${r.got}${r.detail ? `  (${String(r.detail).slice(0, 160)})` : ""}`);
console.log(`${results.filter((r) => r.pass).length} of ${results.length} as expected; account ${account?.id ?? "none"}, transfer ${transfer?.id ?? "none"}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
