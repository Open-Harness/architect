# from-abi

`ortho new adapter <name> --from-abi <file>` (unit A1, #1164), `--from-abi` given once per contract, reads each file, an ABI
(a JSON array) or an artifact holding one (`{ abi, bytecode }`, forge's `{ abi, bytecode: { object } }`), names the contract by
the file's base name (`out/ERC20.sol/ERC20.json` is `ERC20`) and writes the adapter `@orthograph/generators/abi` makes to
`plugins/<name>/`: `abi/`, `src/generated/` and the scaffolds, `src/index.ts` and `package.json` (the shape is
`packages/generators/src/modules/abi/README.md`). Running it again puts every generated file back and leaves the scaffolds.

It refuses before writing anything, exit 2: a name that isn't lower case words, a file it `could not read`, one it `could not
parse` as JSON, and whatever the generator refuses, in its words. Its last line says what it made:
`generated adapter <name>: <c> contracts, <n> calls, <e> events, <r> errors`. Given neither `--from-openapi` nor `--from-abi`,
or both, `ortho new adapter` says it needs one of them, exit 2. Test: `from-abi.test.ts`; the command itself is judged in
`e2e/m2/11-new-adapter-from-abi.test.ts`.
