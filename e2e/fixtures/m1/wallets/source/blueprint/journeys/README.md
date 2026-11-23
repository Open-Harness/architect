# The wallet plugin's journeys (M1.28)

Written by the ✍️ author of slice M1.28 for `@orthograph/wallets`, which M1.29 builds; the refusal journeys below were
added once M1.29 existed, because the first four reached only `SimulationReverted` and coverage found `KeyLocked` and
`NoSuchKey` reached by no journey; `zz-depth-three.ts` was added by the ✍️ author of M1.38. **The builder of M1.29 never edits these files** (AGENTS.md, "Journeys and checks come first"); `e2e/m1/09-wallet-journeys.test.ts` fails if a copy in
`packages/wallets/blueprint/journeys/` differs by one byte.

## What is here

| File | Journey | Signer |
|---|---|---|
| `node.ts` | wallet on the node signer | encrypted keystore file (Web3 Secret Storage v3), on the CLI's host |
| `browser.ts` | wallet on the browser signer | EIP-1193 provider, on the browser host |
| `keystore.ts` | wallet on the keystore signer | a server's key store, holding a world-generated test key |
| `world.ts` | wallet on the world signer | the world's own test wallets |
| `zz-depth-three.ts` | wallet at depth three on the world signer | the world's own test wallets, on a chain whose depth is three (M1.38, below) |

Each story is the same eight steps, so a signer that behaves differently shows up as the one journey that fails:
create a key; list it (1); import the world's funded key; list both (2); sign a message; send and see `confirmed` at
nonce 0; a send whose simulation reverts is refused with `SimulationReverted`; the next send is `confirmed` at nonce 1
(the refused one sent nothing and used no nonce).

The four stories above (`node.ts`, `browser.ts`, `keystore.ts`, `world.ts`) are the happy path. Five more journeys reach the
declared refusals the stories do not, so that every error an operation declares is reached on it (prove's coverage eval
reports an error "reached by no journey" otherwise, and any app mounting the wallet fails `prove`):

| File | Journey | Steps (each refused, nothing sent, no event) |
|---|---|---|
| `node-refusals.ts`, `browser-refusals.ts`, `keystore-refusals.ts`, `world-refusals.ts` | wallet refusals on the `<signer>` signer | 3: `import` a secret that is no key (for `browser`, something that is no account) is `KeyLocked`; `sign` with a label the signer does not hold is `NoSuchKey`; `send` from such a label is `NoSuchKey` |
| `no-signer.ts` | wallet refusals on no signer | 5: `create`, `import`, `keys`, `sign` and `send` on `signer: "nowhere"`, a signer the wallet does not have, are each `KeyLocked` |

| Operation | `KeyLocked` reached by | `NoSuchKey` reached by | `SimulationReverted` reached by |
|---|---|---|---|
| `create` | `no-signer.ts` | | |
| `import` | `<signer>-refusals.ts` (four), `no-signer.ts` | | |
| `keys` | `no-signer.ts` | | |
| `sign` | `no-signer.ts` | `<signer>-refusals.ts` (four) | |
| `send` | `no-signer.ts` | `<signer>-refusals.ts` (four) | the four stories, `zz-depth-three.ts` |

The refusal journeys make no key and send nothing, so they leave the world as they found it and the stories' counts (`keys`
answers 1, then 2; nonce 0, then 1) hold in any order. They never need a world of their own, and name no key or address
(`chain.payee` is the only thing read from the world).

### The depth-three journey (M1.38)

`zz-depth-three.ts` is three steps on the world signer: import the world's funded key under a label of its own (`deep`), send and see it `confirmed`
with a `wallet.send.level` span in the send's trace, and a send the chain would revert refused as
`SimulationReverted` before anything is sent. It is the journey of K7 F2's depth: a send answers `confirmed` only once the
chain's declared number of blocks count (the including block first), so **the world it runs in must declare depth three on
its chain and must keep mining** (a world mines by `evm_mine` or an interval; the journey cannot mine). Its names are those of
check 18 (`e2e/m1/18-confirmation-depth.test.ts`, which holds the depth itself: it mines block by block over RPC and reads the
level the send reports at 0, 1, 2 and 3 blocks). `s.world.chain.depth` is the number the world declares; nothing in the
journey names it, because a journey cannot say what chain it needs. How prove stands this journey's chain at depth three (a
declaration for the wallet journeys' world, read by prove's device host the way it reads `chain` today) is the builder of M1.38's
call, and is the one thing this journey asks of prove that exists nowhere yet. At depth one it would pass for the wrong
reason; check 18's own steps are what prove the depth.

It is the one journey that is not independent of the others: it shares the world signer, and the world's funded key, with
`world.ts`, so it names its key's label `deep` (the same funded key under a second label, so `world.ts`'s own label and its
counts are not touched) and has no nonce check, and its file name sorts last (`zz-`) so it runs after `world.ts`, whose
`keys` counts (1, then 2) and nonces (0, then 1) it would otherwise move. Check 09 holds both.

Not reached, because no journey can put a world's signer in that state (the world gives a node signer its own passphrase,
its own provider never declines, a key stored is always a key): a node keystore with no or a wrong passphrase, a browser
wallet that declines, a signer that cannot sign. The plugin's own tests (`packages/wallets`) cover those; a world that
could lock a signer would let a journey reach them.

## How M1.29's builder picks them up

1. Copy these ten files, unchanged, to `packages/wallets/blueprint/journeys/` (`cp`, not a rewrite).
2. They import `../things/wallet/verbs/{create,import,keys,sign,send}.js` and `../things/wallet/errors.js`. Write
   those declarations in the package so those imports resolve, with the **contract** below. The stand-in's own
   declarations (`../things/wallet/`, beside this folder) are the reference, but the package may add to them.
3. Everything else is yours: handlers per host, the `Signer` for each host, the CAIP-10 values.

## The declaration contract the journeys rely on

Thing `wallet`. All five operations are `allowed: [Blueprint.anyone]` and `runs: "client"` (M1.27).

| Operation | Payload | Answer | Errors |
|---|---|---|---|
| `wallet.create` | `signer`, `label` (text) | `wallet` (id), `account` (text: CAIP-10) | `KeyLocked` |
| `wallet.import` | `signer`, `label`, `source` (text) | `wallet`, `account` | `KeyLocked` |
| `wallet.keys` | `signer` | `count` (uint), `accounts` (text) | `KeyLocked` |
| `wallet.sign` | `signer`, `label`, `message` | `signature` (text: `0x` + 130 hex) | `KeyLocked`, `NoSuchKey` |
| `wallet.send` | `signer`, `label`, `to` (CAIP-10 text), `value` (uint, wei) | `transaction` (text: `0x` + 64 hex), `level` (text), `nonce` (uint) | `SimulationReverted`, `KeyLocked`, `NoSuchKey` |

`signer` is one of `node`, `browser`, `keystore`, `world`: where the key lives (K7 F5, "each wallet declares it").
`label` names a key on a signer. `source` is what `import` brings in: a secret key for `node`, `keystore` and `world`;
for `browser`, the account the EIP-1193 provider already holds.

## What a world with a chain must give (M1.31 and the app's world)

The journeys read these from `s.world`, and name no key and no address themselves:

- `chain.keys.<signer>`: for each signer, a key the world generated and funded on its local chain (at least 10^20 wei
  and at nonce 0). For `browser` it is the account the world's EIP-1193 provider holds.
- `chain.payee`: a CAIP-10 account to pay, generated by the world.

A key created by `wallet.create` is empty; only the imported key sends.
