// Journey-author file: the Bridge stand-in keeps Bridge's header rules and answers with deposit details a bank would
// give, so the bridge-* journeys can judge a relay against it once a step can reach it (#995, gap 3).
import { createHash, createVerify, generateKeyPairSync, createSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createWorld, ibanOf } from "../plugins/bridge/src/stand-in/world.ts";
import { depositActivity, envelope, signatureHeader } from "../plugins/bridge/src/stand-in/webhooks.ts";
import { isBicFor, isIban, isRoutingNumber, isUsAccountNumber } from "../journeys/support/deposit-details.ts";

const fresh = () => {
  let n = 0;
  return createWorld({ now: () => Date.UTC(2026, 11, 1, 9), random: () => `id${String(++n).padStart(30, "0")}`, saved: () => undefined });
};
const post = (path: string, body: unknown, key = "k1") => ({ method: "POST", path, apiKey: "test-key", idempotencyKey: key, body: JSON.stringify(body) });
const approved = (world: ReturnType<typeof fresh>) => {
  const link = world.handle(post("/v0/kyc_links", { type: "business", full_name: "Acme Trading Limited", email: "finance@acme-trading.test" }, "kyb")).body as { id: string; customer_id: string };
  world.decide(link.id, "approved");
  return link.customer_id;
};
const vaBody = (currency: string) => ({ source: { currency }, destination: { currency: "usdc", payment_rail: "ethereum", address: "0x3f5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE" } });

describe("the Bridge stand-in", () => {
  it("refuses a call without an Api-Key (401), and a POST without an Idempotency-Key (400), sending nothing on", () => {
    const world = fresh();
    expect(world.handle({ method: "GET", path: "/v0/kyc_links/x", apiKey: undefined, idempotencyKey: undefined, body: undefined }).status).toBe(401);
    expect(world.handle({ ...post("/v0/kyc_links", { type: "individual", full_name: "A", email: "a@b.test" }), idempotencyKey: undefined }).status).toBe(400);
    expect(world.issued().kycLinks).toEqual([]);
  });

  it("gives the first answer again for a key it has seen, and makes nothing new", () => {
    const world = fresh();
    const customer = approved(world);
    const first = world.handle(post("/v0/transfers", { on_behalf_of: customer, amount: "300.25", source: { currency: "usdc", payment_rail: "ethereum" }, destination: { currency: "usd", payment_rail: "ach", external_account_id: "ea_1" } }, "rent"));
    const again = world.handle(post("/v0/transfers", { on_behalf_of: customer, amount: "300.25", source: { currency: "usdc", payment_rail: "ethereum" }, destination: { currency: "usd", payment_rail: "ach", external_account_id: "ea_1" } }, "rent"));
    expect(again).toEqual(first);
    expect(world.issued().transfers.map((t) => [t.idempotency_key, t.amount, t.currency, t.state])).toEqual([["rent", "300.25", "usd", "awaiting_funds"]]);
    const other = world.handle(post("/v0/transfers", { on_behalf_of: customer, amount: "300.25", source: { currency: "usdc", payment_rail: "ethereum" }, destination: { currency: "usd", payment_rail: "ach", external_account_id: "ea_1" } }, "rent-2"));
    expect((other.body as { id: string }).id).not.toBe((first.body as { id: string }).id);
  });

  it("opens no virtual account before the customer is approved", () => {
    const world = fresh();
    const link = world.handle(post("/v0/kyc_links", { type: "business", full_name: "Acme", email: "a@b.test" }, "kyb")).body as { customer_id: string };
    expect(world.handle(post(`/v0/customers/${link.customer_id}/virtual_accounts`, vaBody("usd"), "va")).status).toBe(400);
  });

  it("gives Lead Bank's routing number and the guide's account numbers for USD, each account its own", () => {
    const world = fresh();
    const customer = approved(world);
    const a = world.handle(post(`/v0/customers/${customer}/virtual_accounts`, vaBody("usd"), "va1")).body as { source_deposit_instructions: Record<string, string> };
    const b = world.handle(post(`/v0/customers/${customer}/virtual_accounts`, vaBody("usd"), "va2")).body as { source_deposit_instructions: Record<string, string> };
    expect([a, b].map((v) => [v.source_deposit_instructions["bank_name"], v.source_deposit_instructions["bank_routing_number"], v.source_deposit_instructions["bank_account_number"]])).toEqual([
      ["Lead Bank", "101019644", "215268120000"],
      ["Lead Bank", "101019644", "215268120001"],
    ]);
    expect(isRoutingNumber("101019644") && isUsAccountNumber("215268120000")).toBe(true);
    expect(world.issued().virtualAccounts.map((v) => v.source_deposit_instructions["bank_account_number"])).toEqual(["215268120000", "215268120001"]);
  });

  it("gives the guide's bank, BIC and account with true check digits for EUR, then the next accounts", () => {
    // The guide's own IE90MODR14035307970528 fails mod 97 (remainder 57): its true check digits are 34 (CX-bridge.md).
    expect([isIban("IE90MODR14035307970528"), ibanOf(14035307970528n)]).toEqual([false, "IE34MODR14035307970528"]);
    const world = fresh();
    const customer = approved(world);
    const ibans = ["e1", "e2"].map((k) => (world.handle(post(`/v0/customers/${customer}/virtual_accounts`, vaBody("eur"), k)).body as { source_deposit_instructions: Record<string, string> }).source_deposit_instructions);
    expect(ibans.map((i) => [i["iban"], i["bic"]])).toEqual([["IE34MODR14035307970528", "MODRIE00XXX"], [ibanOf(14035307970529n), "MODRIE00XXX"]]);
    expect(ibans.every((i) => isIban(i["iban"]) && isBicFor(i["bic"], i["iban"]))).toBe(true);
  });

  it("signs a webhook as Bridge does: RSA over SHA256(SHA256(\"<t>.<body>\")), and one key's signature fails another's", () => {
    const keys = () => generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
    const [ours, theirs] = [keys(), keys()];
    const sign = (pem: string) => (s: string) => createSign("sha256").update(createHash("sha256").update(s).digest()).sign(pem, "base64");
    const body = JSON.stringify(envelope({ id: "wh_1", developer: "dev", sequence: 1, category: "kyc_link", mutation: "updated.status_transitioned", object: { id: "kycl_1", kyc_status: "approved" }, status: "approved", at: 0 }));
    const verify = (header: string, pem: string) => {
      const [, t, v0] = /^t=(\d+),v0=(.+)$/.exec(header)!;
      return createVerify("sha256").update(createHash("sha256").update(`${t}.${body}`).digest()).verify(pem, v0!, "base64");
    };
    expect(verify(signatureHeader(body, 1_700_000_000_000, sign(ours.privateKey)), ours.publicKey)).toBe(true);
    expect(verify(signatureHeader(body, 1_700_000_000_000, sign(theirs.privateKey)), ours.publicKey)).toBe(false);
  });

  it("reports one deposit as three activity events, each with its own id and the deposit's one deposit_id", () => {
    const events = depositActivity({ ids: ["a", "b", "c"], depositId: "dep_1", customer: "c1", virtualAccount: "va1", currency: "usd", amount: "1250.5", sender: "Jane Payer", at: 0 });
    expect(events.map((e) => [e.id, e["type"], e["deposit_id"], e["amount"]])).toEqual([
      ["a", "funds_received", "dep_1", "1250.5"],
      ["b", "payment_submitted", "dep_1", "1250.5"],
      ["c", "payment_processed", "dep_1", "1250.5"],
    ]);
  });
});
