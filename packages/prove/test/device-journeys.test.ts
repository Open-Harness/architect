// M1.29: prove runs a plugin's operations that run on the device through their `world` entry. The wallet plugin's ten
// journeys (four of eight steps, four of three refusals, one of five, one of three at depth three), pass against a real Anvil, their spans and the log that decided the refusal read back
// from a receiver, and the nine evals judge them (`device-journeys.ts` does it all in a plain Node process). Skipped
// unless ORTHO_CHAIN_EVM_ANVIL=1 (Foundry's anvil on the PATH), as every test that starts a chain is.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");

interface Result { readonly notes: ReadonlyArray<string>; readonly journeys: ReadonlyArray<string>; readonly evals: ReadonlyArray<string>; readonly closing: { readonly passed: boolean } }

const run = (mode: "wallets" | "standin") => {
  const ran = spawnSync(process.execPath, [join(import.meta.dirname, "device-journeys.ts"), mode], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 280_000 });
  expect(ran.status, `${ran.stdout}${ran.stderr}`).toBe(0);
  const line = ran.stdout.split("\n").find((l) => l.startsWith("RESULT "));
  expect(line, ran.stdout).toBeDefined();
  return JSON.parse(line!.slice("RESULT ".length)) as Result;
};

it.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("the stand-in of check 09, its world entries empty: each journey fails naming its first step and the defect it reached", { timeout: 300_000 }, () => {
  const result = run("standin");
  const text = result.journeys.join("\n");
  const first: Record<string, string> = {
    ...Object.fromEntries(["node", "browser", "keystore", "world"].map((s) => [`wallet on the ${s} signer`, `create a key on the ${s} signer`])),
    ...Object.fromEntries(["node", "browser", "keystore", "world"].map((s) => [`wallet refusals on the ${s} signer`, `import ${s === "browser" ? "something that is no account" : "a secret that is no key"} onto the ${s} signer is refused as locked`])),
    "wallet refusals on no signer": "create a key on a signer the wallet does not have is refused as locked",
    "wallet at depth three on the world signer": "import the world's funded key at depth three",
  };
  for (const [name, step] of Object.entries(first)) {
    expect(text, name).toMatch(new RegExp(`^journey ${name} ✘ `, "m"));
    expect(text, name).toContain(`✘ "${step}"`);
  }
  expect(text).toContain("BlankReached");
  expect(text).not.toMatch(/skipped/);
  expect(result.closing.passed).toBe(false);
});

it.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("the wallet's ten journeys pass every step through prove's device path, and every eval passes, coverage of every declared refusal included", { timeout: 300_000 }, () => {
  // The plugin ships JavaScript (M1-plugins section 1): build it as `nx build wallets` does.
  const built = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(repo, "packages/wallets/tsconfig.build.json")], { encoding: "utf8" });
  expect(built.status, `${built.stdout}${built.stderr}`).toBe(0);
  expect(existsSync(join(repo, "packages/wallets/dist/feature.js"))).toBe(true);

  const result = run("wallets");
  expect(result.notes).toEqual([]);
  const signers = ["browser", "keystore", "node", "world"];
  expect(result.journeys.slice().sort()).toEqual([
    ...signers.map((s) => `journey wallet on the ${s} signer ✔ 8/8 steps`),
    ...signers.map((s) => `journey wallet refusals on the ${s} signer ✔ 3/3 steps`),
    "journey wallet refusals on no signer ✔ 5/5 steps",
    // M1.38: red until the wallet emits `wallet.send.level` (step 3's `spans` check) at the depth the world declares.
    "journey wallet at depth three on the world signer ✔ 3/3 steps",
  ].sort());
  // Every declared refusal (KeyLocked, NoSuchKey and SimulationReverted) is reached by a journey on every operation that declares it.
  expect(result.evals.filter((e) => e.includes("✘") && !/ \d+ of \d+ evals ✘/.test(e))).toEqual([]);
  expect(result.evals.filter((e) => /^wallet\.\w+ coverage ✔/.test(e))).toHaveLength(5);
  expect(result.evals.filter((e) => /^wallet\.send (steps|explainability|declared errors|answer shape) ✔/.test(e))).toHaveLength(4);
});
