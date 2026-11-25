// #995 gap 5 (G16-adapter-mounts, call 2): a door that verifies Bridge's signature. Bridge signs each delivery with
// `X-Webhook-Signature: t=<ms>,v0=<base64>`, RSASSA-PKCS1-v1_5 under the endpoint's public key over SHA256(SHA256("<t>.<raw body>"))
// (https://apidocs.bridge.xyz/platform/additional-information/webhooks/signature). The door's form is
// `verify: { scheme: "rsa-pkcs1-sha256", header, within }`; the public key, as PEM, is the door's secret, `<MOUNT>_WEBHOOK_SIGNING`.
// A delivery more than `within` seconds from the door's clock, either way, is refused; every refusal is 401 BadSignature, nothing written.
//
// The signer below is WebCrypto's RSASSA-PKCS1-v1_5 with SHA-256 over SHA256("<t>.<body>"): it hashes once more, so the signature is
// over the double hash. It was checked once against Bridge's own Node sample (crypto.createVerify('SHA256').update(digest)), which
// accepts it and refuses a signature over the once-hashed string.
import { env } from "cloudflare:workers";
import { Clock, Context, Effect, Schema } from "effect";
import { Blueprint, type AdapterDoor } from "orthograph";
import { beforeAll, describe, expect, it } from "vitest";
import { Inbound } from "./service.ts";
import type { Door } from "./types.ts";

const NOW = Date.parse("2026-12-01T09:00:00.000Z");
const WINDOW_MS = 600_000;
const text = new TextEncoder();

// Bridge's envelope (webhooks/structure): the event's name is its category, `kyc_link`, which the adapter calls `kycLink`.
const kycLink = Blueprint.incoming(
  Schema.Struct({ event_id: Schema.String, event_category: Schema.String, event_type: Schema.String, event_object_id: Schema.String, event_object_status: Schema.String }),
  { id: (p) => p.event_id, actor: () => undefined },
);
// The door's RSA form is G16-adapter-mounts call 2; until it is built, `AdapterDoor` has only the HMAC form, so the descriptor is cast.
const doorOf = (header: string, within: number): Door => {
  const rule = { signing: Blueprint.secret.stored(), verify: { scheme: "rsa-pkcs1-sha256", header, within }, event: { path: ["event_category"] } } as unknown as AdapterDoor;
  return { mount: "bridge", adapter: Blueprint.adapter({ description: "Bridge's webhooks.", events: { kycLink }, door: rule }), events: ["kycLink"], sources: [], secret: "BRIDGE_WEBHOOK_SIGNING" };
};
const door = doorOf("x-webhook-signature", 600);

type Keys = { readonly pair: CryptoKeyPair; readonly pem: string };
const RSA = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;
const pemOf = async (key: CryptoKey) => {
  const b64 = btoa(String.fromCharCode(...new Uint8Array((await crypto.subtle.exportKey("spki", key)) as ArrayBuffer)));
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----\n`;
};
const keys = async (): Promise<Keys> => {
  const pair = (await crypto.subtle.generateKey(RSA, true, ["sign", "verify"])) as CryptoKeyPair;
  return { pair, pem: await pemOf(pair.publicKey) };
};
const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const sha256 = (data: Uint8Array | string) => crypto.subtle.digest("SHA-256", typeof data === "string" ? text.encode(data) : data);

let bridge: Keys;
let other: Keys;
beforeAll(async () => {
  bridge = await keys();
  other = await keys();
});

/** Bridge's signature: RSA PKCS#1 v1.5 (SHA-256) over SHA256("<t>.<body>"), so over the double hash. */
const signed = async (t: string, body: string, key: CryptoKey = bridge.pair.privateKey) =>
  b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, await sha256(`${t}.${body}`)));
const header = async (t: number | string, body: string, key?: CryptoKey) => `t=${t},v0=${await signed(String(t), body, key)}`;

/** The door's clock, as the generated server hands it the world's: the request runs at `at`. */
const clockAt = (at: number): Context.Context<never> => {
  const base = Effect.runSync(Effect.clockWith(Effect.succeed));
  const fixed = Object.assign(Object.create(Object.getPrototypeOf(base) as object) as object, base, {
    currentTimeMillisUnsafe: () => at,
    currentTimeNanosUnsafe: () => BigInt(at) * 1_000_000n,
    currentTimeMillis: Effect.sync(() => at),
    currentTimeNanos: Effect.sync(() => BigInt(at) * 1_000_000n),
  }) as Clock.Clock;
  return Context.make(Clock.Clock, fixed) as Context.Context<never>;
};

let n = 0;
/** A fresh Bridge event, so each test's journal row is its own. */
const event = (status = "approved") => JSON.stringify({ event_id: `wh_rsa_${++n}_${crypto.randomUUID().slice(0, 8)}`, event_category: "kyc_link", event_type: "kyc_link.updated.status_transitioned", event_object_id: "kyc_1", event_object_status: status });
const idOf = (body: string) => (JSON.parse(body) as { event_id: string }).event_id;

const post = (body: string, headers: Record<string, string>, options: { readonly at?: number; readonly secret?: string | null; readonly door?: Door } = {}) =>
  Inbound.handle(
    { doors: [options.door ?? door], db: env.DB, secrets: options.secret === null ? {} : { BRIDGE_WEBHOOK_SIGNING: options.secret ?? bridge.pem } },
    new Request("http://door/_in/bridge", { method: "POST", headers, body }),
    clockAt(options.at ?? NOW),
  ).then(async (r) => ({ status: r.status, body: (await r.json()) as unknown }));

const rows = (body: string) => env.DB.prepare(`SELECT "id", "operation", "event" FROM "_journal" WHERE "id" = ?`).bind(`bridge:${idOf(body)}`).all<{ id: string; operation: string; event: string }>().then((r) => r.results);
const REFUSED = { status: 401, body: { _tag: "BadSignature" } };
/** Refused with the door's one answer, and nothing of the delivery was written. */
const refusedWhole = async (body: string, headers: Record<string, string>, options?: Parameters<typeof post>[2]) => {
  expect(await post(body, headers, options)).toEqual(REFUSED);
  expect(await rows(body)).toEqual([]);
};

describe("a door that verifies Bridge's RSA signature (#995 gap 5)", () => {
  it("accepts a delivery Bridge signed, once, and sees the same event again", async () => {
    const body = event();
    const h = { "x-webhook-signature": await header(NOW, body) };
    expect(await post(body, h)).toEqual({ status: 200, body: { accepted: true } });
    expect(await rows(body)).toEqual([{ id: `bridge:${idOf(body)}`, operation: "in:bridge", event: "kycLink" }]);
    expect(await post(body, { "x-webhook-signature": await header(NOW + 5_000, body) }, { at: NOW + 5_000 })).toEqual({ status: 200, body: { seen: true } });
    expect(await rows(body)).toHaveLength(1);
  });

  it("reads the header by its name in any case, as HTTP does", async () => {
    const body = event();
    expect(await post(body, { "X-Webhook-Signature": await header(NOW, body) })).toEqual({ status: 200, body: { accepted: true } });
  });

  it("takes a public key whose PEM has its body on one line, or CRLF line ends, as an environment may hold it", async () => {
    const lines = bridge.pem.trim().split("\n");
    for (const pem of [`${lines[0]}\n${lines.slice(1, -1).join("")}\n${lines.at(-1)}`, bridge.pem.replaceAll("\n", "\r\n")]) {
      const body = event();
      expect(await post(body, { "x-webhook-signature": await header(NOW, body) }, { secret: pem })).toEqual({ status: 200, body: { accepted: true } });
    }
  });

  it("holds the ten-minute window at both edges, either way, on the door's clock", async () => {
    for (const [t, ok] of [[NOW - WINDOW_MS, true], [NOW - WINDOW_MS - 1, false], [NOW + WINDOW_MS, true], [NOW + WINDOW_MS + 1, false]] as const) {
      const body = event();
      const h = { "x-webhook-signature": await header(t, body) };
      if (ok) expect(await post(body, h), `t = now ${t - NOW} ms`).toEqual({ status: 200, body: { accepted: true } });
      else await refusedWhole(body, h);
    }
    // The same signed delivery, judged by a clock that moved on: fresh at its own instant, stale ten minutes and a second later.
    const body = event();
    const h = { "x-webhook-signature": await header(NOW, body) };
    await refusedWhole(body, h, { at: NOW + WINDOW_MS + 1_000 });
    expect(await post(body, h, { at: NOW })).toEqual({ status: 200, body: { accepted: true } });
  });

  it("reads t as milliseconds: a delivery stamped in seconds is stale, however well it is signed", async () => {
    const body = event();
    await refusedWhole(body, { "x-webhook-signature": await header(Math.floor(NOW / 1000), body) });
  });

  it("refuses a body changed by one byte, a t changed under the same signature, and either part swapped from another delivery", async () => {
    const body = event();
    const sig = await signed(String(NOW), body);
    const changed = body.replace('"approved"', '"approvee"');
    expect(changed).toHaveLength(body.length);
    await refusedWhole(changed, { "x-webhook-signature": `t=${NOW},v0=${sig}` });
    await refusedWhole(body, { "x-webhook-signature": `t=${NOW + 1},v0=${sig}` });
    const second = event();
    await refusedWhole(second, { "x-webhook-signature": `t=${NOW},v0=${sig}` });
  });

  it("refuses what is signed some other way: another key, one hash or three, the body alone or without the dot, an HMAC keyed by the PEM", async () => {
    const body = event();
    const t = String(NOW);
    const priv = bridge.pair.privateKey;
    const hmacKey = await crypto.subtle.importKey("raw", text.encode(bridge.pem), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const ways: Record<string, string> = {
      "another key": await signed(t, body, other.pair.privateKey),
      "one hash": b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", priv, text.encode(`${t}.${body}`))),
      "three hashes": b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", priv, await sha256(new Uint8Array(await sha256(`${t}.${body}`))))),
      "the body alone": b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", priv, await sha256(body))),
      "t and body without the dot": b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", priv, await sha256(`${t}${body}`))),
      "HMAC keyed by the PEM": b64(await crypto.subtle.sign("HMAC", hmacKey, text.encode(`${t}.${body}`))),
    };
    for (const [way, sig] of Object.entries(ways)) {
      expect(await post(body, { "x-webhook-signature": `t=${t},v0=${sig}` }), way).toEqual(REFUSED);
    }
    expect(await rows(body)).toEqual([]);
  });

  it("refuses a PSS signature under the endpoint's own key", async () => {
    // The same modulus, imported for PSS: right key, wrong padding.
    const jwk = await crypto.subtle.exportKey("jwk", bridge.pair.privateKey);
    const pssKey = await crypto.subtle.importKey("jwk", { ...jwk, alg: "PS256" }, { name: "RSA-PSS", hash: "SHA-256" }, false, ["sign"]);
    const body = event();
    const sig = b64(await crypto.subtle.sign({ name: "RSA-PSS", saltLength: 32 }, pssKey, await sha256(`${NOW}.${body}`)));
    await refusedWhole(body, { "x-webhook-signature": `t=${NOW},v0=${sig}` });
  });

  it("refuses a header that is missing, empty, in another header, or not t=<ms>,v0=<base64>", async () => {
    const body = event();
    const sig = await signed(String(NOW), body);
    const bad: ReadonlyArray<Record<string, string>> = [
      {},
      { "x-webhook-signature": "" },
      { "x-signature": `t=${NOW},v0=${sig}` },
      { "x-webhook-signature": `t=${NOW}` },
      { "x-webhook-signature": `v0=${sig}` },
      { "x-webhook-signature": `t=${NOW},v1=${sig}` },
      { "x-webhook-signature": `t=,v0=${sig}` },
      { "x-webhook-signature": `t=soon,v0=${sig}` },
      { "x-webhook-signature": `t=${NOW},v0=` },
      { "x-webhook-signature": `t=${NOW},v0=${sig.slice(0, -8)}` },
      { "x-webhook-signature": `t=${NOW},v0=@@${sig.slice(2)}` },
      { "x-webhook-signature": `sha256=${sig}` },
    ];
    for (const h of bad) expect(await post(body, h), JSON.stringify(h).slice(0, 60)).toEqual(REFUSED);
    expect(await rows(body)).toEqual([]);
  });

  it("refuses everything, with its answer and never a crash, when the mount's key is missing, empty, not a PEM, not a key, not RSA, private, or another endpoint's", async () => {
    const ec = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const pkcs8 = btoa(String.fromCharCode(...new Uint8Array((await crypto.subtle.exportKey("pkcs8", bridge.pair.privateKey)) as ArrayBuffer)));
    const privatePem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
    for (const secret of [null, "", "not a key", "-----BEGIN PUBLIC KEY-----\nbm90YWtleXk=\n-----END PUBLIC KEY-----\n", await pemOf(ec.publicKey), privatePem, other.pem]) {
      const body = event();
      await refusedWhole(body, { "x-webhook-signature": await header(NOW, body) }, { secret });
    }
  });

  it("takes its header and its window from the door's rule, not Bridge's defaults", async () => {
    const own = doorOf("x-bridge-sig", 60);
    const inside = event();
    expect(await post(inside, { "x-bridge-sig": await header(NOW - 60_000, inside) }, { door: own })).toEqual({ status: 200, body: { accepted: true } });
    const stale = event();
    await refusedWhole(stale, { "x-bridge-sig": await header(NOW - 61_000, stale) }, { door: own });
    const elsewhere = event();
    await refusedWhole(elsewhere, { "x-webhook-signature": await header(NOW, elsewhere) }, { door: own });
  });

  it("judges the window to the millisecond when the clock is between seconds", async () => {
    const at = NOW + 500;
    const past = event();
    await refusedWhole(past, { "x-webhook-signature": await header(at - WINDOW_MS - 1, past) }, { at });
    const future = event();
    await refusedWhole(future, { "x-webhook-signature": await header(at + WINDOW_MS + 1, future) }, { at });
    const edge = event();
    expect(await post(edge, { "x-webhook-signature": await header(at - WINDOW_MS, edge) }, { at })).toEqual({ status: 200, body: { accepted: true } });
  });

  it("verifies every delivery afresh: an accepted header on a new body is refused", async () => {
    const first = event();
    const h = { "x-webhook-signature": await header(NOW, first) };
    expect(await post(first, h)).toEqual({ status: 200, body: { accepted: true } });
    await refusedWhole(event(), h);
  });

  it("refuses a stale delivery with a fresh t added after it, an empty body with no header, and a key carried in the header", async () => {
    const OLD = NOW - 700_000;
    const stale = event();
    await refusedWhole(stale, { "x-webhook-signature": `t=${OLD},v0=${await signed(String(OLD), stale)},t=${NOW}` });
    expect(await post("", {})).toEqual(REFUSED);
    expect(await post("", { "x-webhook-signature": `t=${NOW},v0=${await signed(String(NOW), "{}")}` })).toEqual(REFUSED);
    const body = event();
    const spki = b64((await crypto.subtle.exportKey("spki", other.pair.publicKey)) as ArrayBuffer);
    await refusedWhole(body, { "x-webhook-signature": `t=${NOW},v0=${await signed(String(NOW), body, other.pair.privateKey)},k=${spki}` });
  });

  it("hashes the body's bytes as they came: spaces and a final newline are signed, and kept", async () => {
    const body = `${JSON.stringify(JSON.parse(event()), null, 1)}\n`;
    expect(await post(body, { "x-webhook-signature": await header(NOW, body) })).toEqual({ status: 200, body: { accepted: true } });
  });

  it("decodes v0 strictly, as Bridge says: unpadded base64 is refused", async () => {
    const body = event();
    const sig = await signed(String(NOW), body);
    expect(sig.endsWith("=")).toBe(true);
    await refusedWhole(body, { "x-webhook-signature": `t=${NOW},v0=${sig.replace(/=+$/, "")}` });
  });

  it("leaves an HMAC door as it was beside it", async () => {
    // The HMAC form is unchanged by the RSA form: GitHub's style, no scheme, still verifies and still refuses an RSA header.
    const hmacDoor: Door = {
      mount: "notes",
      adapter: Blueprint.adapter({ description: "A sender of notes.", events: { kycLink }, door: { signing: Blueprint.secret.stored(), verify: { header: "x-sig", prefix: "sha256=", signs: "body" }, event: { path: ["event_category"] } } }),
      events: ["kycLink"], sources: [], secret: "NOTES_WEBHOOK_SIGNING",
    };
    const body = event();
    const key = await crypto.subtle.importKey("raw", text.encode("hmac-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const hex = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, text.encode(body))), (b) => b.toString(16).padStart(2, "0")).join("");
    const send = (headers: Record<string, string>) =>
      Inbound.handle({ doors: [hmacDoor], db: env.DB, secrets: { NOTES_WEBHOOK_SIGNING: "hmac-secret" } }, new Request("http://door/_in/notes", { method: "POST", headers, body }), clockAt(NOW)).then((r) => r.status);
    expect(await send({ "x-webhook-signature": await header(NOW, body) })).toBe(401);
    expect(await send({ "x-sig": `sha256=${hex}` })).toBe(200);
  });
});
