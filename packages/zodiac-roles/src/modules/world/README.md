# world

`ZodiacWorld.install(rpcUrl)`: the world starter for a chain that is Anvil. It puts Zodiac's `ModuleProxyFactory` at
`0x000000000000aDdB49795b0f9bA5BC298cDda236` and the Roles 2.1.1 mastercopy at
`0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5`, with the libraries it links (Integrity at
`0x6a6Af4b16458Bc39817e4019fB02BD3b26d41049`, Packer at `0x869718C939652084BC491fBC5ce0D3C1d5B309F0`), each with the
code it has on every public chain. A chain that already has them is left as it is, with no block mined.

How the canonical deployment reproduces (the author's finding, 26 November 2026): the ERC-2470 singleton factory from its
presigned transaction (`@gnosis-guild/zodiac-core` 4.3.1, `factory/erc2470Factory`), then `ModuleProxyFactory` through
it with zodiac-core's salt (`factory/proxyFactory`), then Integrity and Packer with salt 0, then the Roles mastercopy,
linked to them, with constructor `(0x…01, 0x…01, 0x…01)` and salt 0. The creation code of the last three is in
`zodiac-roles-sdk` 4.2.0's typechain (`Integrity__factory`, `Packer__factory`, `Roles__factory`; the ABI matches
`@gnosis-guild/zodiac` 5.0.1's roles 2.1.1 exactly). `anvil_setCode` of the recorded runtime code is just as good, as long as the
mastercopy's storage is what its constructor left (owner, avatar and target `0x…01`, initialised: `world.test.ts`'s first
test reads the three and sees a second `setUp` refused `InvalidInitialization`): the check reads the code hashes and that
storage, not how they got there.

**The bytes are the package's own, pinned by their code hashes.** The builder records the creation or runtime code of
the factory, Integrity, Packer and the Roles mastercopy in this module, checked against the four hashes in `world.test.ts`.
`@gnosis-guild/zodiac-core` 4.3.1 and `zodiac-roles-sdk` 4.2.0 are named only as where the bytes came from: the package
takes no Zodiac dependency, so the three-day rule (R1-release-age) needs no override (the lead's call on #1204's review).
**Licence:** Zodiac's contracts are LGPL-3.0+. The builder adds that notice and the licence's text beside the bytes it
ships, as `LICENSE-zodiac` cited from the file that holds them, the way chain-evm has `LICENSE-prb-effect-evm` and this
package has `LICENSE-safe-contracts` for its test fixtures.

Test: `world.test.ts`, on Anvil, skipped unless `ORTHO_CHAIN_EVM_ANVIL=1`.
