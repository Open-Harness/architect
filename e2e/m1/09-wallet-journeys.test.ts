// Check 09 (M1.28): the wallet plugin's journeys fail on empty handlers. The journeys are the ten files in
// `e2e/fixtures/m1/wallets/source/blueprint/journeys/`: one story per host signer, one of refusals per host signer
// (`KeyLocked` on `import`, `NoSuchKey` on `sign` and `send`), one for a signer the wallet does not have (`KeyLocked`
// on all five operations), so every declared refusal is reached on every operation that declares it, and one for a send on a
// chain of depth three (M1.38, `zz-depth-three.ts`, named to sort last because it shares the world signer; check 18 holds the surface it needs); the stand-in `@fixture/wallets` is the
// plugin as M1.29 will ship it, declarations and all, with every handler empty. Each journey must fail, naming its first
// step; none may pass and none may be skipped.
//
// Assumptions beyond K7 and M1-plugins (the README beside the journeys says the same, for M1.29's builder):
//  1. The five operations are `wallet.create`, `import`, `keys`, `sign`, `send`, all `allowed: [Blueprint.anyone]` and
//     `runs: "client"` (M1.27). `signer` in every payload (`node`, `browser`, `keystore`, `world`) says where the key
//     lives; `label` names a key on a signer. Keys are text values: CAIP-10 accounts; a signature is 0x + 130 hex.
//  2. A client operation's host entries are `src/<thing>/<verb>.{node,browser,world}.js`, default export a `Handler`
//     (M1-plugins says only "`.node.js` and `.browser.js`"; `.world.js` is the name this check gives M1.27's `world` entry).
//  3. The keystore signer is reached through the same five operations as the others. M1.29 says it is "a server operation
//     signing"; if it splits out into server operations, the keystore journey needs a new author, not an edit.
//  4. `import` takes `source`: a world-generated secret for node, keystore and world; for browser, the account the
//     EIP-1193 provider holds. `create` makes an empty key; only an imported, funded key sends.
//  5. A world with a chain gives `s.world.chain.keys.<signer>` (a funded key at nonce 0, at least 10^20 wei) and
//     `s.world.chain.payee` (a CAIP-10 account). M1-plugins leaves plugin starting worlds open, so the journeys name no
//     `starts` and read `s.world`. Until a world gives them, their steps say "nothing at world.chain...".
//  6. `confirmed` is what `send` answers as `level` in a local world, and `nonce` is the sender's, so a refused send is
//     proved to have sent nothing by the next send taking the next nonce. The doomed send is a value no world funds.
//  7. A failed step in prove's report is `  ✘ "<title>": ...` under its `journey <name> ✘` line; a blank handler is a defect
//     and its name, `BlankReached`, appears in the report (as it does in check 02). Every wallet journey's first step is
//     `create`, which needs nothing from the world, so an empty handler is what stops it, not a missing world.
//  8. Prove runs the app's own journeys and evals as well; only the ten wallet journeys' lines are judged here.
//  9. No Docker (M1.33, K10 section 8): prove's Collector is a pinned binary run as a process, `ORTHO_COLLECTOR_BIN` or the
//     copy cached under `~/.cache/orthograph` (`ORTHO_CACHE_DIR`), fetched and digest-checked by prove itself when it is not
//     there. So the only precondition this check can state is that a `ORTHO_COLLECTOR_BIN` that is set names a file; if it
//     does not, the check fails closed and says so. It never skips and it starts nothing itself: prove starts the Collector
//     and stops it, and `nothingRunning` below sees that no process of the copy is left.
// 10. Anvil in a world is M1.31 (needs M1.30's `@orthograph/chain-evm`). Its test below is a tripwire that fails, naming
//     what is missing, until both exist; it is not a proof of them.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Prove } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { PORTS, fixtures, nothingRunning, project, repo, run, succeeds, writeMount, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const signers = ["node", "browser", "keystore", "world"] as const;
const journeysDir = join(fixtures, "wallets/source/blueprint/journeys");
const operations = ["create", "import", "keys", "sign", "send"] as const;
/** Each journey's first step: the one an empty handler must stop. */
const firstStep = (signer: string) => `create a key on the ${signer} signer`;
const journeyName = (signer: string) => `wallet on the ${signer} signer`;
const refusalsName = (signer: string) => `wallet refusals on the ${signer} signer`;
const refusalsFirstStep = (signer: string) => `import ${signer === "browser" ? "something that is no account" : "a secret that is no key"} onto the ${signer} signer is refused as locked`;
const noSigner = { file: "no-signer.ts", name: "wallet refusals on no signer", firstStep: "create a key on a signer the wallet does not have is refused as locked" } as const;
/** M1.38: a send on a chain whose depth is three. Its `wallet.send.level` span is what check 18 requires of the wallet. */
const depthThree = { file: "zz-depth-three.ts", name: "wallet at depth three on the world signer", firstStep: "import the world's funded key at depth three" } as const;
/** Every wallet journey: its file, its name and the first step an empty handler must stop. */
const journeys = [
  ...signers.map((s) => ({ file: `${s}.ts`, name: journeyName(s), firstStep: firstStep(s) })),
  ...signers.map((s) => ({ file: `${s}-refusals.ts`, name: refusalsName(s), firstStep: refusalsFirstStep(s) })),
  noSigner,
  depthThree,
];

/** Where prove would look for its Collector: an `ORTHO_COLLECTOR_BIN` that is set must name a file (prove fails on it too, but later and less plainly). */
const collectorIsFindable = () => {
  const given = process.env["ORTHO_COLLECTOR_BIN"];
  if (given !== undefined && given !== "") expect(existsSync(given), `ORTHO_COLLECTOR_BIN names ${given}, which is not there. Prove needs its Collector binary, so this check fails closed.`).toBe(true);
};

/** acme with @fixture/wallets installed (a variant of it, or as shipped), mounted by hand, and generated. */
const generated = (variant?: string) => {
  const copy = project({ kind: "wallets", ...(variant ? { variant } : {}) });
  copies.push(copy);
  writeMount(copy.root, "feature", "wallets", { pkg: "@fixture/wallets" });
  return copy;
};

/** Run prove and give each wallet journey's own lines: its `journey` line and the step lines under it. */
const proveWallets = async (root: string, port: number) => {
  const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port })));
  const blocks = new Map<string, Array<string>>();
  let current: Array<string> | undefined;
  for (const line of report.lines) {
    if (line.startsWith("journey ")) {
      const name = journeys.map((j) => j.name).find((n) => line.startsWith(`journey ${n} `));
      current = name ? [line] : undefined;
      if (name && current) blocks.set(name, current);
    } else if (current && line.startsWith("  ")) current.push(line);
    else current = undefined;
  }
  return { report, blocks, all: report.lines.join("\n") };
};

/** Every wallet journey is there, failed, naming its first step, and none is skipped. */
const expectEachFails = (result: Awaited<ReturnType<typeof proveWallets>>) => {
  expect(result.report.passed, result.all).toBe(false);
  for (const { name, firstStep: first } of journeys) {
    const block = result.blocks.get(name);
    expect(block, `no journey "${name}" in the report: ${result.all}`).toBeDefined();
    const text = (block ?? []).join("\n");
    expect(text, `${name}: the journey must fail, not pass\n${text}`).toMatch(new RegExp(`^journey ${name} ✘ `));
    expect(text, `${name}: the journey must name its first step\n${text}`).toContain(`✘ "${first}"`);
    expect(text, `${name}: no step of a wallet journey is skipped\n${text}`).not.toMatch(/skipped/);
  }
  expect(result.all, "an empty handler is a defect that names itself").toContain("BlankReached");
};

describe("09 the journeys: two per signer and one for no signer, each covering what M1.28 names", () => {
  it("there are exactly ten; the four stories (node, browser, keystore and world) run every operation and both outcomes of a send", () => {
    expect(readdirSync(journeysDir).filter((f) => f.endsWith(".ts")).sort()).toEqual(journeys.map((j) => j.file).sort());
    for (const signer of signers) {
      const source = readFileSync(join(journeysDir, `${signer}.ts`), "utf8");
      expect(source, signer).toContain(`Blueprint.journey("${journeyName(signer)}"`);
      for (const op of operations) expect(source, `${signer} runs wallet.${op}`).toMatch(new RegExp(`s\\.holder\\.run\\(${op === "import" ? "importKey" : op},`));
      // Both signs and sends name only their own signer, and no step names a key or an address.
      expect(source.match(/signer: "([a-z]+)"/g)?.every((m) => m === `signer: "${signer}"`), `${signer}: every call names this signer only`).toBe(true);
      expect(source, `${signer}: a confirmed send`).toContain('expect((a) => a.level).toBe("confirmed")');
      expect(source, `${signer}: a doomed send refused`).toContain("refuses(SimulationReverted)");
      expect(source, `${signer}: the refused send sent nothing`).toContain("expect((a) => a.nonce).toBe(1n)");
      expect(source, `${signer}: no key is written in the journey`).not.toMatch(/0x[0-9a-fA-F]{40,}/);
      expect(source, `${signer}: it has no starting world of its own`).not.toContain("starts:");
    }
  });

  it("the refusals reach every declared error on every operation that declares it: KeyLocked on all five, NoSuchKey on sign and send", () => {
    for (const signer of signers) {
      const source = readFileSync(join(journeysDir, `${signer}-refusals.ts`), "utf8");
      expect(source, signer).toContain(`Blueprint.journey("${refusalsName(signer)}"`);
      expect(source.match(/signer: "([a-z]+)"/g)?.every((m) => m === `signer: "${signer}"`), `${signer}: every call names this signer only`).toBe(true);
      expect(source, `${signer}: import refused as KeyLocked`).toMatch(/s\.holder\.run\(importKey,[^\n]*refuses\(KeyLocked\)/);
      for (const op of ["sign", "send"]) expect(source, `${signer}: ${op} refused as NoSuchKey`).toMatch(new RegExp(`s\\.holder\\.run\\(${op},[^\\n]*refuses\\(NoSuchKey\\)`));
      expect(source, `${signer}: it makes no key, so it cannot upset the story`).not.toMatch(/s\.holder\.run\((create|keys),/);
      expect(source, `${signer}: no key is written in the journey`).not.toMatch(/0x[0-9a-fA-F]{40,}/);
      expect(source, `${signer}: it has no starting world of its own`).not.toContain("starts:");
    }
    const none = readFileSync(join(journeysDir, noSigner.file), "utf8");
    expect(none).toContain(`Blueprint.journey("${noSigner.name}"`);
    for (const op of operations) expect(none, `a signer the wallet does not have: ${op}`).toMatch(new RegExp(`s\\.holder\\.run\\(${op === "import" ? "importKey" : op}, \\{ signer: "nowhere"[^\\n]*refuses\\(KeyLocked\\)`));
    expect(none.match(/signer: "([a-z]+)"/g)?.every((m) => m === 'signer: "nowhere"')).toBe(true);
  });

  it("the depth-three story imports and sends on the world signer, runs after every other journey (its name sorts last), sees `confirmed` with a `wallet.send.level` span, and has a doomed send refused", () => {
    const source = readFileSync(join(journeysDir, depthThree.file), "utf8");
    expect(source).toContain(`Blueprint.journey("${depthThree.name}"`);
    for (const op of ["importKey", "send"]) expect(source, `depth three runs ${op}`).toMatch(new RegExp(`s\\.holder\\.run\\(${op},`));
    expect(source.match(/signer: "([a-z]+)"/g)?.every((m) => m === 'signer: "world"'), "every call names the world signer only").toBe(true);
    expect(source, "a confirmed send").toContain('expect((a) => a.level).toBe("confirmed")');
    expect(source, "the send's level span").toContain('spans({ present: ["wallet.send.level"] })');
    expect(source, "a doomed send refused").toContain("refuses(SimulationReverted)");
    expect(source, "no key is written in the journey").not.toMatch(/0x[0-9a-fA-F]{40,}/);
    expect(source, "it has no starting world of its own").not.toContain("starts:");
    // It shares the world signer's keys and its nonce with `world.ts`, so it must run after every other journey, in prove's file order.
    const files = readdirSync(journeysDir).filter((f) => f.endsWith(".ts")).sort();
    expect(files.at(-1), "the depth-three journey sorts after every other journey").toBe(depthThree.file);
  });

  it("M1.29's copy, once there is one, is byte for byte these", () => {
    // Absent is allowed (M1.29 is not built); present and different is not.
    const copy = join(repo, "packages/wallets/blueprint/journeys");
    if (!existsSync(copy)) return;
    for (const { file } of journeys) {
      expect(existsSync(join(copy, file)), `packages/wallets/blueprint/journeys/${file} is missing`).toBe(true);
      expect(readFileSync(join(copy, file), "utf8"), `${file} was edited: journeys belong to their author`).toBe(readFileSync(join(journeysDir, file), "utf8"));
    }
    expect(readdirSync(copy).filter((f) => f.endsWith(".ts")).sort(), "the copy holds these journeys and no others").toEqual(journeys.map((j) => j.file).sort());
  });
});

describe("09 empty handlers: every journey fails, naming its step", () => {
  it("a control that works today: with an empty server handler per operation, each journey runs to its first step and fails there", async () => {
    const copy = generated("server-run");
    succeeds(copy.root, "generate");
    collectorIsFindable();
    expectEachFails(await proveWallets(copy.root, PORTS.walletControl));
    nothingRunning(copy.root);
  });

  it("the stand-in as M1.29 will ship it (client operations, empty node, browser and world entries): each journey fails, naming its step", async () => {
    const copy = generated();
    // M1.27 lifts the compiler's refusal of `runs: "client"`. Until it has, this is where the check stops, and says why.
    const made = run(copy.root, "generate");
    expect(made.status, `ortho generate refuses the client operations, so the journeys cannot run yet (M1.27 not built):\n${made.out}`).toBe(0);
    collectorIsFindable();
    expectEachFails(await proveWallets(copy.root, PORTS.wallets));
    nothingRunning(copy.root);
  });
});

describe("09 the chain: the send steps have somewhere to run", () => {
  it("fails closed, naming what is missing, until the chain adapter (M1.30) and Anvil in a world (M1.31) exist", () => {
    const missing: Array<string> = [];
    if (!existsSync(join(repo, "packages/chain-evm/package.json"))) missing.push("packages/chain-evm, the chain adapter (M1.30)");
    const anvil = spawnSync("anvil", ["--version"], { encoding: "utf8", timeout: 30_000 });
    if (anvil.status !== 0) missing.push("anvil on the path (a plain process in CI: K10 section 8, Foundry in the e2e-m1 job)");
    const mentions = spawnSync("grep", ["-rIli", "--include=*.ts", "--exclude=*.test.ts", "anvil", ...["prove", "host-cloudflare", "compiler"].map((p) => join(repo, "packages", p, "src"))], { encoding: "utf8" });
    if (mentions.stdout.trim() === "") missing.push("a world that starts Anvil (M1.31: Stand.process, always --silent)");
    expect(missing, `the wallet's send journeys cannot pass until: ${missing.join("; ")}. This is a tripwire: it fails, it never skips.`).toEqual([]);
  });
});
