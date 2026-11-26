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
`@gnosis-guild/zodiac` 5.0.1's roles 2.1.1 exactly). `anvil_setCode` of the recorded runtime code is just as good: the
check reads the code hashes, not how they got there.

Test: `world.test.ts`, on Anvil, skipped unless `ORTHO_CHAIN_EVM_ANVIL=1`.
