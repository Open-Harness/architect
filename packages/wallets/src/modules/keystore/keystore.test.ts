import { createDecipheriv, scryptSync } from "node:crypto";
import { Effect, Option, Redacted } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { Keystore } from "./service.ts";

const passphrase = Redacted.make("correct horse");

describe("Keystore (Web3 Secret Storage v3)", () => {
  it("opens the file it made, naming the address without a passphrase", async () => {
    const secret = await Effect.runPromise(Keys.generate);
    const key = await Effect.runPromise(Keys.fromSecret(secret));
    const file = await Effect.runPromise(Keystore.encrypt(secret, passphrase, Keystore.cost.light));
    expect(file).not.toContain(Redacted.value(secret).slice(2));
    expect(JSON.parse(file)).toMatchObject({ version: 3, crypto: { cipher: "aes-128-ctr", kdf: "scrypt" } });
    expect(Keystore.addressOf(file)).toEqual(Option.some(key.address.slice(2).toLowerCase()));
    const opened = await Effect.runPromise(Keystore.decrypt(file, passphrase));
    expect(Redacted.value(opened)).toBe(Redacted.value(secret));
  });

  it("refuses another passphrase and a file that is not a keystore, never saying either", async () => {
    const secret = await Effect.runPromise(Keys.generate);
    const file = await Effect.runPromise(Keystore.encrypt(secret, passphrase, Keystore.cost.light));
    const wrong = await Effect.runPromise(Keystore.decrypt(file, Redacted.make("another")).pipe(Effect.flip));
    expect(wrong).toMatchObject({ _tag: "KeystoreFault", reason: "wrong-passphrase" });
    const malformed = await Effect.runPromise(Keystore.decrypt("{}", passphrase).pipe(Effect.flip));
    expect(malformed).toMatchObject({ reason: "malformed" });
    expect(Option.isNone(Keystore.addressOf("not json"))).toBe(true);
  });

  it("follows the format to the letter: an independent derivation of the file's own MAC and plaintext agrees, at the standard cost", async () => {
    const secret = await Effect.runPromise(Keys.generate);
    const file = JSON.parse(await Effect.runPromise(Keystore.encrypt(secret, passphrase, Keystore.cost.standard))) as {
      crypto: { ciphertext: string; mac: string; cipherparams: { iv: string }; kdfparams: { n: number; r: number; p: number; salt: string; dklen: number } };
    };
    expect(file.crypto.kdfparams).toMatchObject({ n: 262_144, r: 8, p: 1, dklen: 32 });
    const { kdfparams } = file.crypto;
    const derived = scryptSync(Redacted.value(passphrase), Buffer.from(kdfparams.salt, "hex"), 32, { N: kdfparams.n, r: kdfparams.r, p: kdfparams.p, maxmem: 1 << 30 });
    const ciphertext = Buffer.from(file.crypto.ciphertext, "hex");
    expect(Buffer.from(Keys.keccak256(Buffer.concat([derived.subarray(16, 32), ciphertext]))).toString("hex")).toBe(file.crypto.mac);
    const plain = createDecipheriv("aes-128-ctr", derived.subarray(0, 16), Buffer.from(file.crypto.cipherparams.iv, "hex")).update(ciphertext);
    expect(`0x${plain.toString("hex")}`).toBe(Redacted.value(secret));
  });
});
