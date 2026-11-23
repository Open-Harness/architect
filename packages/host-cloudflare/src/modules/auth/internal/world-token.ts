// A world's token for a caller no sign-in makes: the system (the runtime's own work) and a service (an adapter's door).
// Neither has a credential in a real environment; a journey needs one to be either, so a world signs one with its own secret
// (M2-auth, fork 3). The server accepts it only where `/_world/*` is answered, so staging and production cannot be fooled by one.
import { Effect, Option, Schema } from "effect";
import type { Principal } from "orthograph";

/** What a world token starts with, so a bearer credential says which kind it is. */
export const WORLD_PREFIX = "wld_";

/** Who a world token is for. */
export type WorldCaller = { readonly kind: "system" } | { readonly kind: "service"; readonly mount: string };

const Caller = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("system") }),
  Schema.Struct({ kind: Schema.Literal("service"), mount: Schema.String }),
]);
const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Caller));

const HEX = /^[0-9a-f]*$/;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (text: string) => new Uint8Array(text.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);

/** The signature of `payload` under `secret`: HMAC-SHA-256, domain-separated from every other use of the secret. */
const sign = (secret: string, payload: string) =>
  Effect.promise(() => {
    const encoder = new TextEncoder();
    return crypto.subtle
      .importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then((key) => crypto.subtle.sign("HMAC", key, encoder.encode(`world-token|${payload}`)))
      .then((signature) => hex(new Uint8Array(signature)));
  });

/** `wld_<payload in hex>.<signature>`: the caller it is for, signed. */
export const mint = (secret: string, caller: WorldCaller): Effect.Effect<string> => {
  const payload = hex(new TextEncoder().encode(JSON.stringify(caller)));
  return sign(secret, payload).pipe(Effect.map((signature) => `${WORLD_PREFIX}${payload}.${signature}`));
};

const ANONYMOUS: Principal = { kind: "anonymous" };

/** The principal a world token is for, or anonymous when it is not signed by this world's secret. A bad token is never an error. */
export const principalOf = (secret: string, token: string): Effect.Effect<Principal> => {
  const [payload = "", signature = ""] = token.slice(WORLD_PREFIX.length).split(".");
  if (!HEX.test(payload) || payload.length % 2 !== 0) return Effect.succeed(ANONYMOUS);
  return sign(secret, payload).pipe(
    Effect.map((expected): Principal => {
      if (expected !== signature) return ANONYMOUS;
      const caller = parse(new TextDecoder().decode(unhex(payload)));
      return Option.isSome(caller) ? caller.value : ANONYMOUS;
    }),
  );
};
