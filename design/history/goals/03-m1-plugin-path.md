# Goal 3: M1, the plugin path

## The prompt

> You are the 🧭 lead for M1's plugin path in Orthograph, in this repository. Run it as one autonomous goal until every
> slice below is on `m1`, green with its own check, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`; `design/milestones.md` ("How a milestone works" and the whole M1 section, word for word);
> `design/frame/mounting.md` and `design/frame/projections.md`; `design/decisions/K5-the-whole-shape.md`;
> `design/handoff.md`; the ledger rows owned by M1.01 to M1.10; Codex's `layer/4:design/decisions/D4.md` and
> `layer/4:e2e/layer3/`; the `threads`, `conductor` and `reviewer` skills in `.agents/skills/`.
>
> - **Branch:** `m1`, cut from `main` at `32e0281`; one commit per slice, each ending green with its "done when" check;
>   each slice ticked in `milestones.md` with its proof in the commit that lands it; `m1` pushed after every slice.
> - **Separate agents:** ✍️ authors write the checks and journeys, and they fail on `main` for the right reason before
>   any build slice they judge starts; 🔨 builders or the lead write the code and never edit a check, a journey, the
>   evals or the runner's generic checks; a 🔍 reviewer that wrote none of it passes the branch.
> - **Landing:** M1 reaches `main` only as one pull request at Gate M1. This goal opens no `m1` → `main` pull request.
>
> Don't do M1.03, M1.04, M1.11 to M1.13, M1.15, M1.16, M1.21 to M1.26: other threads and later goals take them.
>
> **Scope change, 18 November 2026 (Aaron: "solid on the vendoring lets do it", then "kick it all off").** After M1.10
> the wallet path is this goal's too: M1.14, M1.27, M1.31, M1.32 and M1.29 by the lead; M1.28 (the wallet journeys) by
> a ✍️ author subagent and M1.17 (stores) by a 🔨 builder subagent, each on a branch off `m1` that the lead merges;
> M1.18 to M1.20 (`codex/m1-o2`) and M1.30 (`codex/m1-chain-evm`) by Codex, each a PR into `m1` with its own 🔍
> reviewer, merged by the lead after the lead's own check. Codex is steered by PR comments only. Only the lead runs
> `e2e:layer2` or `e2e:m1` locally, one at a time: Gate 2's teardown removes every container with the framework's
> prefix. Everyone else leaves the gates to CI.

## The bound

**The end state:** `acme wallet create && acme wallet send` confirms on Anvil from the CLI (M1.29's check), with
plugins mounting by one file and one command on the way.

Plugins mount, with one file and one command. A fixture feature is mounted in a fresh copy of the starter by
`ortho add feature`, its operations appear in the model under their names from paths, the generated SDK, HTTP and MCP
answer from the plugin's own handler, collisions and unmet needs are refused by name, and the uses graph is whole.

- **Local only.** No cloud, no keys, no registry beyond the local Verdaccio. Every world, stage and container made is
  destroyed. Ports 19260 to 19279 for `e2e/m1` (another session may hold 8880).
- **Not in this goal:** the complete model (M1.03), verdict keys (M1.04), projections as plugins (M1.11 to M1.13), the
  port from agent-native (M1.22 to M1.24), the portal (M1.25), the wired scaffold (M1.26; it and M1.03/M1.04 start
  only after M1.10 lands, and the conductor is told when it has), and K7 F1's manifest.

## The rules that shape the slices

1. **The decision first.** M1.01 harvests D4 sections 1 to 3 under the frame's words and pins the public surface the
   checks judge: [`../decisions/M1-plugins.md`](../../decisions/M1-plugins.md). Checks are written against it, never
   against guessed private APIs.
2. **Checks from another agent.** M1.02's author ports Codex's `00` to `06` to `e2e/m1` in the new words, adds `07`
   (descriptors, M1.05) and `08` (verbs, M1.07), and shows each failing on `main` for the right reason.
3. **The model is unchanged without mounts.** A project with no mounts keeps its model and its `generated/` byte for
   byte, so Gates 1, 2 and M0 stay the net.
4. **Fold in K5 and leave K7 open.** Plugin operations are an app's operations, so `emits:`, optional steps, stores and
   the SDK contract reach them unchanged. Runtime behaviour is one module per operation per host, open to F1.

## The slices

| id | what | done when |
|---|---|---|
| M1.01 | the plugin descriptor decision | `decisions/M1-plugins.md` written |
| M1.02 | Codex's checks `00` to `06` ported to `e2e/m1`, plus `07` and `08` | they run and fail for the right reason on `main` |
| M1.05 | the descriptors in `orthograph` | a fixture feature, adapter and projection type-check; a wrong field fails to compile (check `07`) |
| M1.06 | mounts: the compiler reads the three folders and folds each feature into the model | check `01`'s mounts by hand pass |
| M1.07 | the verbs: choose, include, narrow, omit | a fixture narrowed and with one operation omitted generates without it (check `08`) |
| M1.08 | needs and collisions | checks `05` and `06` pass |
| M1.09 | runtime entries per host and import closures (taken if it fits) | check `02` passes |
| M1.10 | `ortho add feature\|adapter\|projection`, pinned exactly under R1 | check `01` passes through one command |
| M1.17 | stores (K3, STO-23), by a 🔨 builder subagent on its own branch | its row's check in `milestones.md` |
| M1.18 to M1.20 | O2's trace fixes, by Codex on `codex/m1-o2` | their rows' checks; merged by the lead |
| M1.14 | adapters' calls out | checks `03` and `04` pass |
| M1.27 | `runs: "client"` | its row's check |
| M1.28 | the wallet journeys, by a ✍️ author subagent | they fail on empty handlers for the right reason |
| M1.30 | `@orthograph/chain-evm`, vendored from `@prb/effect-evm` 5.0.3 by Codex on `codex/m1-chain-evm` | a transfer on Anvil (after M1.14 and M1.31) |
| M1.31 | Anvil in a world: a process locally and in CI, never a container (K10 section 8, PR #62) | its row's check |
| M1.32 | simulation | its row's check |
| M1.33 | Processes, not containers (K10 section 8): starts only once #62 is on main | its row's check, with no `docker` on `PATH` |
| M1.29 | `@orthograph/wallets` | `acme wallet create && acme wallet send` confirms on Anvil from the CLI |

## The loop, for every slice

1. Run the slice's check first and watch it fail for the right reason.
2. Build, run, read the failure, fix. Repeat until it passes and every earlier check still passes
   (`pnpm nx run-many -t check test`, and the gates the slice could touch).
3. Tick the slice in `milestones.md` with its proof, update the ledger rows it closes, commit, push `m1`.
4. Stop everything started: no workerd, wrangler, Verdaccio or port is left running.

## Evidence

Each slice's "done when" run is captured with `tools/evidence/capture.sh M1.<nn> <name> <exit> -- <command>` under
`design/evidence/M1.<nn>/`, never retyped.

## The demo

A fresh copy of `examples/starter`, one `ortho add feature` of the fixture feature, then `ortho check` and `ortho prove`
green. The demo runs `add`, `generate` and `check`. With `--prove`, it also runs local proof, whose loopback OTLP
receiver runs without Docker. M1.33 covers the remaining process migration.

```bash
tools/demo/m1-plugin.sh
```

It builds `@fixture/echo` for real (tsc, esbuild, `npm pack`), installs it in a scratch copy of the starter, and runs:

```text
$ ortho add feature @fixture/echo
wrote blueprint/features/echo.ts
pinned @fixture/echo 1.0.0 (local: no registry release to age)
needs none
next ortho generate, then ortho check
$ ortho generate        (the feature's api, sdk, cli, mcp, docs and server entries)
$ ortho check
check ✔
```

Evidence: [`evidence/goal-03/demo.txt`](../../evidence/goal-03/demo.txt). Check 02 in CI's `e2e-m1` job also runs proof
with the feature mounted.

### Demo: the wallet, `acme wallet create && acme wallet send` (M1.29)

Needs Foundry's `anvil` on the PATH (`foundryup`, or `brew install foundry`) and nothing else: no Docker, no key to give. From the repository root:

```bash
pnpm install
tools/demo/m1-wallet.sh
```

It builds `@orthograph/wallets` (`tsc`), copies acme to a scratch folder, installs the wallet there and mounts it with `ortho add feature`,
generates, starts Anvil as a plain process (`--silent`, loopback, no dev accounts), and then runs the wallet from the generated CLI:

```text
$ acme wallet create --signer node --label demo --json
{"wallet":"wal_cf60269057d23a16","account":"eip155:31337:0xCf60…FBc8"}
$ acme wallet create --signer node --label payee --json
$ acme wallet send --signer node --label demo --to <payee> --value 1000000000000000 --json
{"transaction":"0xa14d…edfc8","level":"confirmed","nonce":"0"}      # payee balance 0 → 1000000000000000 wei
$ acme wallet send … --value 1000000000000000000000000000000        # exit 63, SimulationReverted: nothing signed or sent
$ acme wallet send … --value 2000 --json                            # confirmed, nonce 1: the refused send used none
$ acme wallet sign … (no passphrase)                                # exit 61, KeyLocked
```

The key is made by `acme wallet create` and kept as an encrypted Web3 keystore file (`ls` shows `demo.json`, nothing plain); the
passphrase is made by the script and never shown; the demo funds the new account over RPC on its own local chain. Anvil and the scratch folder
are gone when it ends. By hand, with your own chain (the host's settings are four variables):

```bash
export ORTHO_WALLET_CHAIN=eip155:31337 ORTHO_WALLET_RPC_URL=http://127.0.0.1:8545 ORTHO_WALLET_PASSPHRASE=… # never printed by the wallet
acme wallet create --signer node --label demo && acme wallet send --signer node --label demo --to eip155:31337:0x… --value 1000
```

The four journeys for the four signers (node, browser, keystore, world) run through `ortho prove`'s device path on a real Anvil, and a server
operation signs with a world-generated server key (`Server.keystore`) on the same:

```bash
ORTHO_CHAIN_EVM_ANVIL=1 pnpm exec vitest run --root packages/wallets          # every signer on Anvil; the served server operation
ORTHO_CHAIN_EVM_ANVIL=1 pnpm exec vitest run --root packages/prove test/device-journeys.test.ts   # prove's run of the journeys, and of check 09's stand-in
```

Evidence: [`evidence/M1.29/`](../../evidence/M1.29/).

## Reporting

To the conductor, at the end of every turn, in a `TO THE CONDUCTOR` block: what landed on `m1`, what Aaron can now run,
and what is left before Gate M1. Questions for Aaron are batched in the grill format, only when truly blocked.
