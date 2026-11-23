# plugins

Owns `Blueprint.feature`, `Blueprint.adapter` and `Blueprint.projection` (a plugin's descriptor, its package's root
export), `Blueprint.choice`, `Blueprint.need`, `Blueprint.call`, `Blueprint.setting`, `Stand`, the ways in (`Via`),
hosts, doors and how a projection ships, and `Blueprint.use`: the mount, with its four verbs (choose, include, narrow,
omit). Everything here is pure, frozen metadata; the compiler checks it and names it from paths
([`design/decisions/M1-plugins.md`](../../../../../design/decisions/M1-plugins.md)). `Mounts.picked` (on
`orthograph/server`) says what a mount picked of a choice, by identity. A mount also carries the adapter's `calls`, which an operation names in `Blueprint.step.call(<mount>.calls.<call>)`
(`Blueprint.step.call` itself is in `operations`); the compiler checks that the mount `include`d it. Test: `plugins.test.ts` (with type tests).
