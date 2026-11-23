# browser-host

`BrowserHost.signer(name)`: the signers a browser has, for the `*.browser.js` entries. Only `browser` is there: the
wallet the page was given as `window.ethereum` (EIP-1193), its labels kept in `localStorage` (memory when the page has
none). The others are `absent`: each refuses as `KeyLocked` and says why in a log (`node` is a file on a person's machine,
`keystore` lives on a server, `world` only in a world).

The chain comes from `globalThis.ORTHOGRAPH_WALLET`, a plain object with `ORTHO_WALLET_CHAIN` and `ORTHO_WALLET_RPC_URL`, read
through Effect's config provider: a browser has no process environment.

Nothing here imports Node: this is the module a browser's closure holds (check 11 asserts it of the operation's host entry).
