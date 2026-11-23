# chain

The chain a wallet is on: `Chain.fromHost` reads `ORTHO_WALLET_CHAIN` (CAIP-2, default `eip155:1`) and
`ORTHO_WALLET_RPC_URL` and `ORTHO_WALLET_DEPTH` through Effect's config provider, and `Chain.port(setting)` is the `@orthograph/chain-evm`
port for it. A wallet with no RPC endpoint makes keys, lists and signs; a send is a defect that names the variable.

The host decides where the values come from. A CLI reads its environment; a browser supplies a provider of its own; a
world gives the chain it stood. Nothing here holds a key.

**Depth** (K7 F2, M1.38) is how many blocks count before a send is `confirmed`, the block it is in as the first. A host
declares it with `ORTHO_WALLET_DEPTH` (a whole number of at least 1; `0`, `-1`, `1.5` and `three` are defects naming the
variable), a world with `chain.depth`. Chain id 31337 is local and is depth 1 without a declaration; any other chain has
none: `fromHost` still answers (keys work on any chain) with `depth` undefined, and a send on it is a defect naming
`ORTHO_WALLET_DEPTH`, asked before anything is prepared, signed or sent.

**No nonce state outlives a send.** `Chain.port` makes a port, with its own nonce manager, and a send throws it away: the
next send's `prepare` reads the pending nonce from the chain, so nothing kept here can drift from it. What a process
does share is `Chain.lock(setting, from)`: one lock per `chainId|rpcUrl|account`, made in one step on the first ask
(`internal/lanes.ts`). A keyed send holds it from `prepare` until the node has accepted the broadcast.
