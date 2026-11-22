// What a check says to a door as the fixture bank would: its signing scheme repeated here by hand, so a door that
// verifies something else is caught (fixtures/events/bank/source/adapter.ts says the wire; M5-checks call 3 fixes it).
import { createHmac } from "node:crypto";
import { json, type Answer } from "./world.ts";

/** The bank's signing secret in a world: the test value its `blueprint/secrets.ts` declares. */
export const SECRET = "whsec_bank_fixture_test";

/** The wire body: `{ id, type, ...fields }`. */
export const rawOf = (id: string, type: string, fields: object) => JSON.stringify({ id, type, ...fields });

/** `bank-signature`'s value: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. */
export const signed = (raw: string, options: { readonly at?: number; readonly secret?: string } = {}) => {
  const at = options.at ?? Math.floor(Date.now() / 1000);
  return `t=${at},v1=${createHmac("sha256", options.secret ?? SECRET).update(`${at}.${raw}`).digest("hex")}`;
};

/**
 * POST `raw` to `/_in/<mount>` as a sender would. The signature is the true one unless `signature` says otherwise
 * (`null` sends none); `trace` is a `traceparent` the door continues, so the check can read the journal of its own request.
 */
export const post = (url: string, raw: string, options: { readonly mount?: string; readonly signature?: string | null; readonly trace?: string; readonly method?: string } = {}): Promise<Answer> => {
  const signature = options.signature === undefined ? signed(raw) : options.signature;
  return fetch(`${url}/_in/${options.mount ?? "bank"}`, {
    method: options.method ?? "POST",
    headers: { "content-type": "application/json", ...(signature === null ? {} : { "bank-signature": signature }), ...(options.trace ? { traceparent: options.trace } : {}) },
    ...((options.method ?? "POST") === "GET" ? {} : { body: raw }),
  }).then(json);
};
