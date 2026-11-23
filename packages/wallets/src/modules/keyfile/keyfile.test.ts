import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Option, Redacted } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import { afterAll, describe, expect, it } from "vitest";
import { KeyLocked, NoSuchKey } from "../../../blueprint/things/wallet/errors.js";
import { Keystore } from "../keystore/service.ts";
import { Keyfile } from "./service.ts";

const folders: Array<string> = [];
afterAll(() => { for (const f of folders) rmSync(f, { recursive: true, force: true }); });
const directory = () => { const d = join(mkdtempSync(join(tmpdir(), "ortho-keyfile-")), "wallets"); folders.push(join(d, "..")); return d; };
const ring = (dir: string, passphrase: string | undefined) => Keyfile.keyring({ directory: dir, passphrase: passphrase === undefined ? Option.none() : Option.some(Redacted.make(passphrase)), cost: Keystore.cost.light });

describe("Keyfile", () => {
  it("keeps a key as one encrypted file, lists it without a passphrase, and opens it with one", async () => {
    const dir = directory();
    const secret = await Effect.runPromise(Keys.generate);
    const key = await Effect.runPromise(Keys.fromSecret(secret));
    const put = await Effect.runPromise(ring(dir, "pass").put("demo", secret));
    expect(put).toEqual({ label: "demo", address: key.address });
    const file = join(dir, "demo.json");
    expect(readFileSync(file, "utf8")).not.toContain(Redacted.value(secret).slice(2));
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(await Effect.runPromise(ring(dir, undefined).held)).toEqual([{ label: "demo", address: key.address }]);
    expect(Redacted.value(await Effect.runPromise(ring(dir, "pass").open("demo")))).toBe(Redacted.value(secret));
  });

  it("is locked without the passphrase or with another, and has no key it was not given", async () => {
    const dir = directory();
    await Effect.runPromise(ring(dir, "pass").put("demo", await Effect.runPromise(Keys.generate)));
    expect(await Effect.runPromise(ring(dir, undefined).open("demo").pipe(Effect.flip))).toBeInstanceOf(KeyLocked);
    expect(await Effect.runPromise(ring(dir, "other").open("demo").pipe(Effect.flip))).toBeInstanceOf(KeyLocked);
    expect(await Effect.runPromise(ring(dir, undefined).put("more", await Effect.runPromise(Keys.generate)).pipe(Effect.flip))).toBeInstanceOf(KeyLocked);
    expect(await Effect.runPromise(ring(dir, "pass").open("nobody").pipe(Effect.flip))).toBeInstanceOf(NoSuchKey);
    expect(readdirSync(dir)).toEqual(["demo.json"]);
  });

  it("never overwrites a file, and a label cannot climb out of the folder", async () => {
    const dir = directory();
    const first = await Effect.runPromise(Keys.generate);
    await Effect.runPromise(ring(dir, "pass").put("demo", first));
    await expect(Effect.runPromise(ring(dir, "pass").put("demo", await Effect.runPromise(Keys.generate)))).rejects.toThrow(/could not be written/);
    expect(Redacted.value(await Effect.runPromise(ring(dir, "pass").open("demo")))).toBe(Redacted.value(first));
    await Effect.runPromise(ring(dir, "pass").put("../escape", await Effect.runPromise(Keys.generate)));
    expect(readdirSync(dir).sort()).toEqual(["..%2Fescape.json", "demo.json"]);
    expect(await Effect.runPromise(ring(dir, undefined).held)).toHaveLength(2);
  });
});
