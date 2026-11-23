// Whether a delivery is signed as its sender signs: HMAC-SHA256 over the raw bytes (GitHub), or over `<version>:<timestamp>:<bytes>`
// with a timestamp inside a window (Slack's v0). The comparison is the platform's constant-time `verify`, never `===`.
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

/** True only when every part is there and the signature is the sender's: a missing secret, header, prefix, stale time or wrong digest is false. */
export const verified = (rule: AdapterDoor["verify"], secret: string | undefined, headers: Headers, body: Uint8Array): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const given = headers.get(rule.header);
    if (secret === undefined || secret === "" || given === null || !given.startsWith(rule.prefix)) return false;
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
