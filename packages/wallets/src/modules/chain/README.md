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

**One lane per chain.** `Chain.port` makes a new port, with a new nonce manager, on every call. `Chain.shared(setting)` is
the port every send uses: the process keeps one per `chainId|rpcUrl` (`internal/lanes.ts`), so two sends in flight from
one account take distinct nonces even when each came from a signer its host made for that call. It is read and filled
inside the send; only a port that was made is kept, so an unreachable chain on one send does not fail the next, and sends
that arrive before any port exists wait on one build. A world's Anvil has its own URL, so worlds stay apart.
