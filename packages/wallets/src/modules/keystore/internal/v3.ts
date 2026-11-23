// Web3 Secret Storage v3: https://ethereum.org/developers/docs/data-structures-and-encoding/web3-secret-storage
// scrypt(passphrase, salt) -> 32 bytes; the first 16 are the aes-128-ctr key, the last 16 go into the MAC with the
// ciphertext: keccak256(derived[16..32] ++ ciphertext).
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { Effect, Option, Redacted, Schema } from "effect";
import { Keys, type Hex } from "@orthograph/chain-evm/device";
import { KeystoreFault, type Cost } from "../types.ts";

const File = Schema.Struct({
  version: Schema.Literal(3),
  address: Schema.optional(Schema.String),
  crypto: Schema.Struct({
    cipher: Schema.Literal("aes-128-ctr"),
    ciphertext: Schema.String,
    cipherparams: Schema.Struct({ iv: Schema.String }),
    kdf: Schema.Literal("scrypt"),
    kdfparams: Schema.Struct({ dklen: Schema.Literal(32), n: Schema.Number, p: Schema.Number, r: Schema.Number, salt: Schema.String }),
    mac: Schema.String,
  }),
});
const parse = Schema.decodeUnknownOption(Schema.fromJsonString(File));

/** A cap, not an allocation: scrypt takes what 128 · n · r needs, and a file that asks for far more is refused. */
const MAXMEM = 1024 * 1024 * 1024;

const derive = (passphrase: Redacted.Redacted<string>, salt: Buffer, cost: Cost) =>
  Effect.callback<Buffer>((resume) => {
    scrypt(Redacted.value(passphrase).normalize("NFKC"), salt, 32, { N: cost.n, r: cost.r, p: cost.p, maxmem: MAXMEM }, (error, key) =>
      resume(error === null ? Effect.succeed(key) : Effect.die(new Error("scrypt could not derive a key: the cost needs more memory than is allowed"))));
  });

const macOf = (derived: Buffer, ciphertext: Buffer) => Buffer.from(Keys.keccak256(Buffer.concat([derived.subarray(16, 32), ciphertext])));

export const encrypt = (secret: Redacted.Redacted<Hex>, passphrase: Redacted.Redacted<string>, cost: Cost, address: string) =>
  Effect.gen(function* () {
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const derived = yield* derive(passphrase, salt, cost);
    const cipher = createCipheriv("aes-128-ctr", derived.subarray(0, 16), iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(Redacted.value(secret).slice(2), "hex")), cipher.final()]);
    return JSON.stringify({
      version: 3,
      id: randomUUID(),
      address: address.slice(2).toLowerCase(),
      crypto: {
        ciphertext: ciphertext.toString("hex"),
        cipherparams: { iv: iv.toString("hex") },
        cipher: "aes-128-ctr",
        kdf: "scrypt",
        kdfparams: { dklen: 32, n: cost.n, p: cost.p, r: cost.r, salt: salt.toString("hex") },
        mac: macOf(derived, ciphertext).toString("hex"),
      },
    });
  });

export const decrypt = (file: string, passphrase: Redacted.Redacted<string>) =>
  Effect.gen(function* () {
    const parsed = parse(file);
    if (Option.isNone(parsed)) return yield* new KeystoreFault({ reason: "malformed" });
    const { crypto } = parsed.value;
    const { kdfparams } = crypto;
    const ciphertext = Buffer.from(crypto.ciphertext, "hex");
    const derived = yield* derive(passphrase, Buffer.from(kdfparams.salt, "hex"), { n: kdfparams.n, r: kdfparams.r, p: kdfparams.p });
    const expected = Buffer.from(crypto.mac, "hex");
    const mac = macOf(derived, ciphertext);
    if (expected.length !== mac.length || !timingSafeEqual(expected, mac)) return yield* new KeystoreFault({ reason: "wrong-passphrase" });
    const decipher = createDecipheriv("aes-128-ctr", derived.subarray(0, 16), Buffer.from(crypto.cipherparams.iv, "hex"));
    const secret = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return Redacted.make(`0x${secret.toString("hex")}` as Hex);
  });

export const addressOf = (file: string): Option.Option<string> => Option.flatMap(parse(file), (f) => Option.fromNullishOr(f.address?.toLowerCase().replace(/^0x/, "")));
