# journeys

Runs a project's journeys against a local world. `Journeys.load(root, model)` imports the declarations by path (the
same objects the journeys import), every `blueprint/journeys/*.ts` (the docs' place) and `journeys/*.ts`, and every `blueprint/starting-worlds/*.ts`. `Journeys.run`
casts the journey's people (named per journey, so two journeys never share a person), makes the starting world by its
declared calls, then calls each step as its cast member with a fresh `traceparent`. Every call is recorded with its
trace, its journal entries and `mayCall`, decided beforehand from the world's facts and the declaration's `allowed`
(through language-effect's own `Access.check`, over facts read back from the world). A step's checks run as soon as its
call returns, except span checks, which wait for telemetry. Test: `journeys.test.ts`.

A step asks the world for one of four things: an operation or read, the MCP door's tools list, a move of its clock
(`WorldClock`), or a signature, which asks the world nothing (CX-journey-signs, `internal/signing.ts`). Each person in
the cast has one key for the run, made the first time they sign or a step names their `s.<name>.signer`, with
chain-evm's `Keys.generate` (read through the module's export when the key is made) and held by
`@orthograph/wallets/server`'s `Server.keystore`, whose signer makes the EIP-191 signature; the secret stays inside
`Redacted` and the signer, and leaves only as signatures. The same name in another journey, or in another run of the
same one, is another person with another key. `wallets` is loaded when a journey first signs, since it ships built
JavaScript only: prove's `test` target builds it first (`nx build wallets`). The system, a service and the keeper hold
no key: a step that signs as one fails, naming them. A sign step is recorded as a call marked `signs: true`, status 200
and `{ message, signature, signer }` as its body; like a clock step it has no span to wait for. A message ref the world
never gave fails the step, `message: nothing at <path>`, and nothing is signed; in a starting world it stops the journey.
Tests: `signs.test.ts`, `signs-keys.test.ts`.

A plugin's operation that runs on the device (`runs: "client"`, M1.29) is not sent to the server. With a `device` (`DeviceHost`) `Journeys.run` runs the plugin's `<verb>.world.js` entry in this process (`internal/device.ts`): under the app's mount, as an anonymous caller, through `Device.serve`, with a `DeviceWorld` (the chain the world stood, a funded key per host, a folder of its own), its spans and logs sent to the collector as children of the call's own span so the trace reads as a served one's does. The call is recorded as a served one is: 200 and the answer in its wire form, 422 and `{ _tag, code, ... }` for a declared refusal, 500 for a defect (`the server died: BlankReached`). The world's chain is given to journeys as `s.world.chain.keys.<host>` (a secret key for `node`, `keystore` and `world`; the CAIP-10 account its provider holds for `browser`) and `s.world.chain.payee`. Test: `test/device-journeys.test.ts`.
