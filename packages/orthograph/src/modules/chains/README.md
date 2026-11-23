# chains

Owns `Chain.evm.network(name)` and `Chain.evm.token(address)`, imported from `orthograph` as `Cloud` is. They are what an
environment binds: `stores: { budgets: Chain.evm.network("anvil") }` puts the chain store `budgets` on a network, and
`assets: { usdc: { budgets: Chain.evm.token("0x…") } }` says which contract the token asset `usdc` is for that store
(M6-money item 2). Plain frozen data; the compiler checks the names and that every fixed token an environment's chain
stores use is bound. Test: `chains.test.ts`.
