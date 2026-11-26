// Generated from blueprint/projections/infra.ts. Do not edit.
const db      = yield* Cloudflare.D1.Database("Db", { name, migrations });
const relayer = Cloudflare.DurableObject("Relayer", { className: "Relayer" });
const indexer = Cloudflare.DurableObject("Indexer", { className: "Indexer" });
const server  = yield* Cloudflare.Worker("Server", { name, main, bindings: { DB: db, relayer, indexer } });
const factory = yield* Chain.Evm.Factory("Treasury", { network, version }); // new: the contract side
