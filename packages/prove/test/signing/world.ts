// J1's fake world (#1190, CX-journey-signs), for `src/modules/journeys/signs.test.ts` and `signs-keys.test.ts`. Written by
// J1's checks author; a builder never edits it.
//
// A world played by a local HTTP server, as `clock-step.test.ts` does. It casts the people with ids of its own making and
// opens a Safe with an id of its own making (`saf_<random>`), so no journey file can hold the claim's text. At `safe.claim`
// it rebuilds the text from what it made, recovers the signer from the signature it is handed and answers it as `by`.
// Recovery is done here, with noble's secp256k1 and keccak, not with the viem code `wallets` signs with: what judges the
// signature is not what made it.
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { Blueprint } from "orthograph";

// ---- EIP-191 and EIP-55, written out ------------------------------------------------------------------------------
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/** EIP-191's digest of a text message: keccak-256 of the prefix, the UTF-8 byte length and the bytes. */
const digestOf = (message: string) => {
  const text = new TextEncoder().encode(message);
  return keccak_256(new Uint8Array([...new TextEncoder().encode(`\x19Ethereum Signed Message:\n${text.length}`), ...text]));
};

/** EIP-55: the address with each letter upper case where the keccak of its lower-case hex has a nibble of 8 or more. */
export const checksum = (address: string): string => {
  const lower = address.replace(/^0x/, "").toLowerCase();
  const hash = hex(keccak_256(new TextEncoder().encode(lower)));
  return `0x${[...lower].map((c, i) => (Number.parseInt(hash[i]!, 16) >= 8 ? c.toUpperCase() : c)).join("")}`;
};

/** Who signed `message` (EIP-191 `personal_sign`, UTF-8), as a checksummed address; `undefined` for a signature that is no signature. */
export const recover = (message: string, signature: string): string | undefined => {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return undefined;
  const digest = digestOf(message);
  const v = Number.parseInt(signature.slice(130, 132), 16);
  const bit = v >= 27 ? v - 27 : v;
  if (bit !== 0 && bit !== 1) return undefined;
  try {
    const point = secp256k1.Signature.fromCompact(signature.slice(2, 130)).addRecoveryBit(bit).recoverPublicKey(digest);
    return checksum(`0x${hex(keccak_256(point.toRawBytes(false).slice(1))).slice(-40)}`);
  } catch {
    return undefined;
  }
};

/**
 * The signature a key must give for `message`: EIP-191 `personal_sign`, RFC 6979 and low s (noble's defaults, as every
 * Ethereum signer gives), `v` 27 or 28. Made here from the key itself, so a signature is judged whole, byte for byte.
 */
export const reference = (message: string, secret: string): string => {
  const digest = digestOf(message);
  const signed = secp256k1.sign(digest, secret.replace(/^0x/, ""));
  return `0x${signed.r.toString(16).padStart(64, "0")}${signed.s.toString(16).padStart(64, "0")}${(27 + signed.recovery).toString(16)}`;
};

// ---- the declarations the journeys call ----------------------------------------------------------------------------
export const Safe = Blueprint.thing({ description: "A person's Safe, before it is claimed.", fields: { id: Blueprint.id("saf"), by: Blueprint.text() } });
export const open = Blueprint.operation(Safe, { description: "Open a Safe.", payload: {}, answer: { safe: Safe.fields.id }, allowed: [Blueprint.signedIn] });
export const claim = Blueprint.operation(Safe, {
  description: "Claim a Safe with a signature of its claim text.", payload: { safe: Safe.fields.id, signature: Safe.fields.by },
  answer: { by: Safe.fields.by }, allowed: [Blueprint.signedIn],
});

/** The claim's text, as CX-safe-machines gives it: one line, no trailing newline. */
export const claimText = (safe: string | undefined, person: string | undefined) => `Capxul: claim Safe ${safe} for ${person}`;

// ---- the world -----------------------------------------------------------------------------------------------------
export interface World {
  readonly url: string;
  /** Who the world cast, by the name prove asked for (`j<index>.<name>`): their person id. */
  readonly castAs: ReadonlyMap<string, string>;
  /** Each Safe the world opened: the person who opened it. */
  readonly safes: ReadonlyMap<string, string>;
  /** Each claim the world was handed: the text it rebuilt, the signature, and who it recovered. */
  readonly claims: ReadonlyArray<{ readonly safe: string; readonly text: string; readonly signature: string; readonly by: string }>;
  /** Every request the world got: its path and body, as sent. */
  readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string; readonly headers: string }>;
  readonly close: () => Promise<void>;
}

const word = () => randomBytes(6).toString("hex");
const bodyOf = (request: IncomingMessage) =>
  new Promise<string>((done) => { let text = ""; request.on("data", (c: Buffer) => (text += c.toString())); request.on("end", () => done(text)); });

export const startWorld = async (): Promise<World> => {
  const people = new Map<string, string>();
  const castAs = new Map<string, string>();
  const safes = new Map<string, string>();
  const claims: Array<World["claims"][number]> = [];
  const requests: Array<World["requests"][number]> = [];
  const server = createServer((request, response) => {
    void bodyOf(request).then((body) => {
      const path = (request.url ?? "").split("?")[0]!;
      requests.push({ path, body, headers: JSON.stringify(request.headers) });
      const json = (status: number, answer: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(answer));
      const asked = (body === "" ? {} : JSON.parse(body)) as Record<string, unknown>;
      if (path === "/_world/cast") {
        const names = [...((asked["names"] as ReadonlyArray<string>) ?? []), ...((asked["anonymous"] as ReadonlyArray<string>) ?? [])];
        return json(200, Object.fromEntries(names.map((name) => {
          const person = `per_${word()}`;
          const token = `tok_${word()}`;
          people.set(token, person);
          // The first cast under a name is the one kept: a later run of the same journey index is other people again.
          if (!castAs.has(name)) castAs.set(name, person);
          return [name, { person, token, email: `${name}@world.test`, password: "world-password" }];
        })));
      }
      const caller = people.get(String(request.headers.authorization ?? "").replace(/^Bearer /, ""));
      if (path === "/safe/open") {
        if (caller === undefined) return json(401, { _tag: "NotSignedIn" });
        const safe = `saf_${word()}`;
        safes.set(safe, caller);
        return json(200, { safe });
      }
      if (path === "/safe/claim") {
        const safe = String(asked["safe"]);
        const owner = safes.get(safe);
        if (caller === undefined || owner === undefined) return json(404, { _tag: "SafeNotFound" });
        const text = claimText(safe, owner);
        const signature = String(asked["signature"]);
        const by = recover(text, signature);
        if (by === undefined) return json(422, { _tag: "BadSignature" });
        claims.push({ safe, text, signature, by });
        return json(200, { by });
      }
      return json(404, { error: "not found" });
    });
  });
  const url = await new Promise<string>((done) => server.listen(0, "127.0.0.1", () => done(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
  return { url, castAs, safes, claims, requests, close: () => new Promise<void>((done) => server.close(() => done())) };
};
