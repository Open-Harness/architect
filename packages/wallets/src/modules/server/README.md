# server

`Server.keystore({ secret, chain })`: the `keystore` signer for a **server operation** (K7 F5: "apps keep keys where they
choose, on a device or a server; each wallet declares it"). It holds one key, labelled `server`, from a `Redacted`
binding; a server operation's handler calls `signer.send("server", to, value)` and gets what a device gets: simulated
first, signed, submitted, followed to `confirmed`, and `SimulationReverted` before anything is sent when the chain
refuses.

In M1 only a key the world generated is given this way (the done-when: "from a server operation signing with a
world-generated server key"); real secrets come with M2.04 and the hygiene check with M6.18. The secret is read once and
never answered, logged or put in a span. Nothing here imports Node, so a Worker's closure can hold it.

Test: `server.test.ts` serves a real operation (`Handlers.serve`) that sends on a real Anvil with a key the world generated.
