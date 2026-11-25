// Whether a delivery is signed as its sender signs: HMAC-SHA256 over the raw bytes (GitHub), or over `<version>:<timestamp>:<bytes>`
// with a timestamp inside a window (Slack's v0); or RSA PKCS#1 v1.5 under a public key over SHA256("<t>.<bytes>") (Bridge's
// `t=<ms>,v0=<base64>`, G16-adapter-mounts call 2). The comparison is the platform's constant-time `verify`, never `===`.
import { Clock, Effect } from "effect";
import type { AdapterDoor } from "orthograph";

const text = new TextEncoder();
const HEX = /^[0-9a-f]{64}$/i;

const bytesOf = (hex: string): Uint8Array<ArrayBuffer> => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));

const joined = (head: Uint8Array, body: Uint8Array): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
};

type Rule = AdapterDoor["verify"];
type Rsa = Extract<Rule, { readonly scheme: "rsa-pkcs1-sha256" }>;
type Hmac = Exclude<Rule, Rsa>;

// Bridge's header exactly: `t` in milliseconds as written, then `v0` in strict, padded base64. Anything more or less is refused.
const BRIDGE = /^t=(\d{1,15}),v0=((?:[A-Za-z0-9+/]{4})+|(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=))$/;
const PEM = /^-----BEGIN PUBLIC KEY-----([A-Za-z0-9+/=\s]+)-----END PUBLIC KEY-----$/;

const decoded = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Bridge's signature: the PEM's SPKI imported for RSASSA-PKCS1-v1_5, verifying SHA256("<t>.<body>") (which it hashes once more). */
const rsaVerified = (rule: Rsa, pem: string, headers: Headers, body: Uint8Array): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const parts = BRIDGE.exec(headers.get(rule.header) ?? "");
    const key = PEM.exec(pem.trim());
    if (parts === null || key === null) return false;
    const [, t, v0] = parts as unknown as [string, string, string];
    const now = yield* Clock.currentTimeMillis;
    if (Math.abs(now - Number(t)) > rule.within * 1000) return false;
    const publicKey = yield* Effect.tryPromise(() =>
      crypto.subtle.importKey("spki", decoded((key[1] ?? "").replace(/\s+/g, "")), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]),
    );
    const digest = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", joined(text.encode(`${t}.`), body)));
    return yield* Effect.tryPromise(() => crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decoded(v0), digest));
  }).pipe(Effect.orElseSucceed(() => false));

const hmacVerified = (rule: Hmac, secret: string, headers: Headers, body: Uint8Array): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const given = headers.get(rule.header);
    if (given === null || !given.startsWith(rule.prefix)) return false;
    const digest = given.slice(rule.prefix.length);
    if (!HEX.test(digest)) return false;
    let signed: Uint8Array<ArrayBuffer> = joined(new Uint8Array(0), body);
    if (rule.signs !== "body") {
      const stamp = rule.timestamp === undefined ? null : headers.get(rule.timestamp.header);
      if (rule.timestamp === undefined || stamp === null || !/^\d{1,12}$/.test(stamp)) return false;
      const now = yield* Clock.currentTimeMillis;
      if (Math.abs(now / 1000 - Number(stamp)) > rule.timestamp.within) return false;
      signed = joined(text.encode(`${rule.signs.version}:${stamp}:`), body);
    }
    return yield* Effect.promise(() =>
      crypto.subtle.importKey("raw", text.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]).then((key) => crypto.subtle.verify("HMAC", key, bytesOf(digest), signed)),
    );
  });

/** True only when every part is there and the signature is the sender's: a missing secret, header, prefix, stale time or wrong digest is false. */
export const verified = (rule: Rule, secret: string | undefined, headers: Headers, body: Uint8Array): Effect.Effect<boolean> => {
  if (secret === undefined || secret === "") return Effect.succeed(false);
  return "scheme" in rule ? rsaVerified(rule, secret, headers, body) : hmacVerified(rule, secret, headers, body);
};
