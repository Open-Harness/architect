# world

`SafeWorld.install` is the world starter: it puts the pinned deployed code of every `SafeDeployment` contract at its
canonical address on a world's Anvil with `anvil_setCode`, each with the canonical code hash, so a Safe is created in a world
as on Base. `internal/testing.ts` is the checks' own fixture (an Anvil, raw reads, an owner's signature); a builder does
not edit it.

Status: an empty handler until the build lands; `world.test.ts` is the check, on Anvil.
