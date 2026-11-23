# Writing a feature: wallets, step by step

This walks through writing one feature, `wallets`, from an empty folder to an app that mounts it, using the words in
[`README.md`](README.md). It is written from what M1.29 built, in `packages/wallets` (the device half: `create`, `import`,
`keys`, `sign` and `send`). The one part that is still design, the linked half (Sign-In with Ethereum, M2.13), is marked
**proposed** where it comes. The npm scope is `@orthograph` (`design/decisions/K6-orthograph.md`). The canon's page on the
same code is [`docs/canon/chains-and-wallets.mdx`](../../docs/canon/chains-and-wallets.mdx).

**What wallets is.** Keys, held where their signer keeps them (a person's machine, their browser's wallet, a server's key
store, or a world), and the operations to make, bring in, list, sign with and send from them. Where a key lives is the
app's choice and each wallet declares it: the old rule that the server never holds a key was dropped by Aaron on 18
November 2026 (K7 F5). Linking a key to a person's account, proved by signing the server's challenge, is the linked half,
and it comes after auth (M2.13). Its design is the part of the SIWE spike `spikes/authenticated-siwe-link/` proved for real
(26 checks, workerd and D1, a concurrent replay and a restart).

**Five rules this walkthrough follows** (`decisions/K1-kits.md` section 3.6, carried into the frame, and K7):

1. A feature's operations use only the feature's own roles and the roles of the features it needs. Built wallets needs
   nothing, and every operation is `anyone`: a key is the caller's own, on the caller's own device.
2. Agents never link a wallet: linking binds a key to an account (M2.13: `notVia(Agent)`).
3. `wallet.link` will be a client operation over two server operations, `challenge` and `complete` (M2.13).
4. The wallet has two halves. The device half needs a chain adapter and no auth. The linked half needs auth and no chain
   client (K7, "The wallet plugin").
5. Behaviour that runs on a device is written per host (`node`, `browser`, `world`), not per environment.

## Step 1: make the package

`ortho new feature wallets` writes a feature with one placeholder operation and one journey. M1.29 shipped
`packages/wallets` by hand, in the same shape, and its descriptor is the whole of `feature.ts`:

```ts
// packages/wallets/feature.ts
import { Blueprint } from "orthograph";

export default Blueprint.feature({
  description: "Keys on a device or in a server's key store: make, import, list, sign and send.",
  needs: [],
});
```

```text
packages/wallets/
  package.json                   exports: the descriptor, ./server, ./blueprint/*, ./src/*; "orthograph": { "kind": "feature" }
  feature.ts                     the descriptor: what it needs (nothing yet)
  blueprint/
    things/wallet/               the thing, its errors, five operations
    journeys/                    ten journeys, written by a different agent from the builder
  src/
    wallet/<verb>.{node,browser,world}.ts   one line per operation per host
    modules/                     the behaviour, in six-slot modules
    main.ts                      the server entry: Server.keystore
```

The package builds with `tsc` to JavaScript (`nx build wallets`), the shape every plugin ships. Its one runtime
dependency besides Effect is `@orthograph/chain-evm`, the chain adapter (M1.30).

## Step 2: declare

### The thing, and values

```ts
// packages/wallets/blueprint/things/wallet/thing.ts
import { Blueprint } from "orthograph";

export const Wallet = Blueprint.thing({
  description: "A key, kept where its signer keeps it (browser, node, keystore or world), named by its CAIP-10 account.",
  fields: { id: Blueprint.id("wal") },
  code: "WL",
});
```

The wallet holds no secret field and no machine: the key never reaches the server, so it is not state the server owns. A
wallet is named by a **CAIP-10 account**, `eip155:<chain>:<address>`, never a bare address, and its chain is a CAIP-2 id.
Only the `eip155` namespace is built; a Solana or Aztec account parses as nothing and slots in later without reshaping
the thing (K7, "The wallet plugin", item 1). The account is text on the wire, and `modules/account` reads and writes it.
`wal_` plus sixteen characters of the address is the wallet's id, so the same key has the same id on every signer.

### Errors

```ts
// packages/wallets/blueprint/things/wallet/errors.ts
/** The signer refused to sign: the keystore is locked, or the person turned the request down. */
export class KeyLocked extends Blueprint.error({}, { exit: 61 }) {}
/** No key of this label on this signer. */
export class NoSuchKey extends Blueprint.error({}, { exit: 62 }) {}
/** The chain's simulation of the send reverted (or could not pay), so nothing was signed or sent. */
export class SimulationReverted extends Blueprint.error({}, { exit: 63 }) {}
```

### Operations

There are five, all `allowed: [Blueprint.anyone]` and `runs: "client"` (M1.27), so each runs on the caller's device with
no server call and its spans leave from there. `anyone` is safe because nothing leaves the device: the caller's own machine
is the boundary. `signer` in every payload says where the key lives, and `label` names a key on a signer.

| Operation | What it does |
|---|---|
| `wallet.create` | make a key under a label, answer its account |
| `wallet.import` | bring a key in under a label (`source` is a secret key, or for a browser the account its wallet holds) |
| `wallet.keys` | list the accounts of the keys this signer keeps |
| `wallet.sign` | an EIP-191 signature of a message, by the key of a label |
| `wallet.send` | simulate, sign, send and follow a transfer until it is confirmed |

```ts
// packages/wallets/blueprint/things/wallet/verbs/send.ts
export default Blueprint.operation(Wallet, {
  description: "Simulate, sign, send and follow a transfer until it is confirmed.",
  payload: { signer: Blueprint.traced(Blueprint.text({ max: 16 })), label: Blueprint.traced(Blueprint.text({ max: 32 })), to: Blueprint.text({ max: 128 }), value: Blueprint.uint(256) },
  // A transaction hash and its level are public: the chain's own spans name the hash too.
  answer: { transaction: Blueprint.traced(Blueprint.text({ max: 128 })), level: Blueprint.traced(Blueprint.text({ max: 16 })), nonce: Blueprint.uint(64) },
  errors: [SimulationReverted, KeyLocked, NoSuchKey],
  allowed: [Blueprint.anyone],
  runs: "client",
});
```

`import`'s `source` is `Blueprint.visibility.secret`: a secret key travels through it and is recorded nowhere, not in a
span, a log or a journal. `signer`, `label`, the hash and the level are `Blueprint.traced`, so the secrets eval does not
read a journey's `node` or the chain's own `confirmed` as a leak.

## Step 3: what it needs, offers and lets you choose

**Needs.** Nothing. The device half needs no auth and no adapter: `send` reaches the chain through
`@orthograph/chain-evm/device` as a library, so the port's own spans are the receipt spans. The browser's wallet (MetaMask
and the like, spoken to through EIP-1193) is an outside system, but it is reached inside the browser signer; the
`eip1193` adapter and a `Blueprint.need` for it are not built (ledger `ADA-12`).

**The four signers.** A signer is chosen by the payload's `signer`, not by a mount choice, because a payload can name
where the key lives and the host decides which signers it has:

| `signer` | Where the key lives | On which host |
|---|---|---|
| `node` | an encrypted keystore file (Web3 Secret Storage v3) in `ORTHO_WALLET_HOME`, locked with `ORTHO_WALLET_PASSPHRASE` | the CLI, and the SDK run from Node |
| `browser` | the wallet the page was given as `window.ethereum` (EIP-1193); the signer keeps only labels | a browser |
| `keystore` | a server's key store; in M1 only a key the world generated (`Server.keystore`), real secrets are M2.04 | a server operation, and a world |
| `world` | the world's test wallets, in memory | a world |

A host that has no such signer refuses as `KeyLocked`, saying why in a log first. **The Node signer is an encrypted
keystore file, not the OS keychain.** The file format is ours, so the same code runs on macOS, Linux and CI with no
keychain daemon, and the passphrase is never a Blueprint secret: the description never holds anything a person keeps in
their head. The keychain could arrive later as a second signer backed by an adapter. **Passkeys are not offered.** A
passkey signs with P-256, so it needs a smart account checked with ERC-1271, and only plain keys are proved.

**Settings.** Nothing in a payload names a chain, so the chain is a setting of the host, never a choice (a value that
differs by environment is a setting, `decisions/M1-plugins.md` section 5):

| Variable | Meaning | Default |
|---|---|---|
| `ORTHO_WALLET_CHAIN` | the chain accounts are on, CAIP-2 | `eip155:1` |
| `ORTHO_WALLET_RPC_URL` | where to send; without it a wallet makes keys and signs but a send is a defect | none |
| `ORTHO_WALLET_DEPTH` | the blocks that count before a send is `confirmed` (M1.38, K7 F2); only chain 31337 has one without it (1) | none |
| `ORTHO_WALLET_HOME`, `ORTHO_WALLET_PASSPHRASE` | the `node` signer's folder and what locks it | `~/.orthograph/wallets`, none |

A browser has no process environment: it sets `globalThis.ORTHOGRAPH_WALLET`. A world gives the chain it stood, with its
own `chain.depth`.

**Exports.** The signer is internal to the package today (`modules/signer`); a `Blueprint.export` for app code (a
`Signer.sign` an app's own client code could call, a `Verify.linked` for server handlers) is not built (ledger `FEA-07`).

**Secrets: none.** The wallet declares no secret. A key is generated or typed on the device, held where its signer holds
it, and never put in a binding, a commit or a log (K7 F5). A server's key reaches `Server.keystore` as a `Redacted`
binding, read once and never answered.

## Step 4: until there are no blanks, then scaffold

```bash
ortho check --ready
ortho generate          # scaffolds each handler once, with its brief; never overwrites one
```

For a client operation the scaffold is one file per host. M1.29 wrote each as one line over `modules/operations`; the host
decides which signers it has:

```ts
// packages/wallets/src/wallet/send.node.ts
const handler: Handler<typeof declaration> = (payload) => Operations.on(NodeHost.signer).send(payload);
```

`send.browser.ts` is the same over `BrowserHost.signer`, and `send.world.ts` over `WorldHost.signer`, which prove runs in
place of a device. The behaviour sits in six-slot modules under `src/modules/`: `account` (CAIP-10), `chain` (the setting
and the port), `keystore` and `keyfile` (the v3 file), `signer` (one `Signer` per place a key lives), `submit` (the send's
lifecycle), `operations`, `node-host`, `browser-host`, `world` and `server`.

A send is `chain-evm`'s lifecycle, and the wallet never skips a step of it: prepare, simulate, sign, submit, then follow
until the transfer is as deep as the chain's depth asks.

```ts
// packages/wallets/src/modules/submit/internal/flow.ts: the depth is asked for first, then the port tracks it
const states = yield* port.track(submission, { depth }).pipe(
  Stream.tap((state) => (state._tag === "Deepened" ? levelSpan(depth, state.blocks) : Effect.void)),
  Stream.runCollect,
  Effect.catch(refused),
);
```

A transfer whose simulation fails is `SimulationReverted` with nothing signed or sent and its nonce handed back, so the next
send takes the nonce this one would have had.

## Step 5: journeys, written by a different agent

The author reads the declarations and writes the journeys before the builder starts; the journeys fail on the empty
handlers, and the builder never edits `blueprint/journeys/`. There are ten: a story for each of the four signers, one of
refusals for each (`KeyLocked` on `import`, `NoSuchKey` on `sign` and `send`), one for a signer the wallet does not have,
and one for a send at depth three (M1.38).

```ts
// packages/wallets/blueprint/journeys/world.ts: the world signer's story, from the author
s.step(
  "a send whose simulation reverts is refused before anything is sent",
  s.holder.run(send, { signer: "world", label: "funded", to: s.world.chain.payee, value: 1_000_000_000_000_000_000_000_000_000_000n }),
  refuses(SimulationReverted),
  noEvents(),
),
```

A journey names operations, never a way in. A world with a chain gives `s.world.chain.keys.<signer>` (a funded key) and
`s.world.chain.payee`. Prove stands Anvil as a process of the run's scope for every plugin that runs on the device (K7 Q7),
always `--silent`, with the keys generated by the world.

## Step 6: the example app proves the feature on its own

Built: `e2e/fixtures/m1/wallets` is the plugin as its author's stand-in, with every handler empty, and
`e2e/m1/09-wallet-journeys.test.ts` proves each of the ten journeys fails there, naming its first step. The real handlers
pass the same ten journeys against a real Anvil in `packages/prove/test/device-journeys.test.ts`, with the nine evals
judging them (it runs when `ORTHO_CHAIN_EVM_ANVIL=1`, with Foundry's `anvil` on the path). **Proposed:** a browser replay
in Chromium against Anvil as the EIP-1193 provider, with the `react` projection and the `eip1193` adapter's conformance.
No slice builds it yet (ledger `G-11`).

## Step 7: release (proposed)

```bash
ortho version      # compares this model with the last published one
```

```text
@orthograph/wallets 1.0.0 → 1.1.0   minor: added wallet.rename
                                   no payload changed, no refusal code changed
```

The rules are the same as an app's: a new operation is minor, a changed payload or refusal code is major, a budget
change is a patch. CI publishes only a revision whose example is green.

## Step 8: mounting it in acme

The mount is built (M1.01 to M1.10); the table is what the generated surfaces give.

```bash
ortho add feature @orthograph/wallets
```

```ts
// acme/blueprint/features/wallets.ts. The mount's name is this file's name: wallets.
import { Blueprint } from "orthograph";
import wallets from "@orthograph/wallets";

export default Blueprint.use(wallets, (w) => [
  w.omit(importKey),                          // acme won't take imported keys (the plugin's own declaration, imported)
]);
```

| | server | sdk | cli | mcp | docs, portal |
|---|---|---|---|---|---|
| `wallet.create`, `import`, `keys`, `sign`, `send` | · | ✔ local code | ✔ `acme wallet create`, `acme wallet send` | · | ✔ marked "from wallets" |

```bash
ORTHO_WALLET_CHAIN=eip155:31337 ORTHO_WALLET_RPC_URL=http://127.0.0.1:8545 \
ORTHO_WALLET_PASSPHRASE=… acme wallet create --signer node --label demo
```

`wallet import` generates as `import_` and is exported under its own name, because `import` is a reserved word. The model
gains the `wallet` thing, marked `from: wallets`. `generated/` gains the SDK calls and CLI commands. `src/` gains nothing:
the feature's behaviour stays in its package.

## The linked half (proposed, M2.13)

Linking binds a key on this device to the caller's account. It is the part the SIWE spike proved, and it adds three things
to the device half, once auth (M2.05) exists: a `Challenge` thing, server operations `challenge`, `complete`, `unlink` and
`list`, and `link`, a client operation over two of them.

```ts
// wallets/blueprint/things/wallet/verbs/link.ts: planned, M2.13. A client operation over two server operations
export default Blueprint.operation(Wallet, {
  description: "Link a key on this device to your account, by signing the server's challenge.",
  runs: "client",
  allowed: [linker],                             // signedIn.notVia(Via.agent): agents never link (rule 2)
  steps: {
    challenge: Blueprint.step.call(challenge),   // over the server's door, with the caller's own credential
    sign: Blueprint.step.use(Signer.sign),       // here, on the device
    complete: Blueprint.step.call(complete),
  },
});
```

`complete` verifies the signature against the exact ERC-4361 message the server issued, uses the challenge once (a second
completion is refused) and links the address, one account per address on a chain (`wallet/invariants.ts`, G5). The two
`call` steps go to the server with the caller's own credential, so the server checks `linker` again: a client operation
cannot widen what the server allows. Those operations need `Blueprint.step.call` and `step.use` on the device, which the
M1.29 build did not need (`decisions/M1-plugins.md` section 8.2), and an `after:` starting-world fragment so a journey can
begin with a linked wallet (ledger `JOU-10`).

## Today and proposed

| Piece | Built | Proposed |
|---|---|---|
| A feature's package and descriptor | `packages/wallets`, M1.29 | |
| Mounting | `ortho add feature`, M1.01 to M1.10 | |
| `runs: "client"`, with a host entry per host | M1.27 | |
| Five device operations, four signers | M1.29 | |
| The chain adapter, Anvil in a world, simulation | `@orthograph/chain-evm`, M1.30 to M1.32 | |
| Confirmation per chain and environment | M1.38 | |
| `step.call`, `step.use` on a device | | when an adapter needs them |
| Linking over SIWE | proved in `spikes/authenticated-siwe-link` | `challenge`, `complete`, `link`, M2.13 |
| Browser replay, the `eip1193` adapter | | no slice yet |
| Starting-world fragments | | `Blueprint.startingWorld.fragment` |

## Open risks

1. **A browser proof against a stand-in isn't proof against MetaMask.** Anvil as the EIP-1193 provider proves our side
   of the protocol, not each extension's quirks.
2. **Plain keys only.** ERC-1271, ERC-6492 and EIP-7702 verification are unproved. So are passkeys, which wait on them.
3. **Chain and origin policy.** One local chain (31337) is proved. A real chain needs `ORTHO_WALLET_DEPTH`, and deploying
   behind several origins is not decided.
4. **Keystore portability.** Encrypted keystores on Linux CI and Node 24 are untested. The spike ran on macOS with
   Node 26.
5. **Fragments composing.** Two features' fragments that both seed the same cast must order cleanly (`after:`). None is
   built.
6. **The compiler check for rule 1** (feature operations use only their own roles and their needs' roles) is not
   written.
