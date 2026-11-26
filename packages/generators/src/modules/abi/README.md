# abi

`AbiAdapter.generate({ name, contracts })` makes an adapter from contracts' ABIs (unit A1, #1164; `design/decisions/CX-from-abi.md`):
a list of files, pure. `ortho new adapter <name> --from-abi <file>` (`packages/cli`, its `from-abi` module) reads each file and
writes what it answers. The shape below is the one the hand-written adapters `@orthograph/erc20` (A2), `@orthograph/safe` (A3)
and `@orthograph/zodiac-roles` (A4) are written to, and `regenerate.test.ts` holds them to it once they are regenerated.

Each contract is one ABI file, named by its file's base name (`abi/ERC20.json`, or forge's `out/ERC20.sol/ERC20.json`, is the
contract `ERC20`). The file is the ABI (a JSON array of items), or an artifact holding it: `{ "abi": [...], "bytecode": "0x..." }`,
or forge's and Hardhat's `{ "abi": [...], "bytecode": { "object": "0x..." } }`. Bytecode, when there is any (not `0x`), is the
contract's creation code, and the contract gets a `deploy`: its stand-in, deployed into a world's Anvil.

## The files

Paths from the adapter's folder (`plugins/<name>/` for the command; `packages/<name>/` for a framework adapter). A generated file
is put back on every run; a scaffold is written once, when it is absent, and is yours from then on.

| File | How | What |
|---|---|---|
| `abi/<Contract>.json` | generated | the input, normalised: `{ "abi": [...] }`, with `"bytecode": "0x..."` when it has some; `JSON.stringify(x, null, 2)` and a newline. The folder regenerates from itself |
| `src/generated/<Contract>.ts` | generated | everything of one contract (below). Opens `// Generated from abi/<Contract>.json. Do not edit.` |
| `src/generated/index.ts` | generated | `export * as <Contract> from "./<Contract>.ts";` per contract, sorted; then `calls` and `standIn` for the descriptor. Opens `// Generated from abi/. Do not edit.` |
| `src/index.ts` | scaffold | the descriptor, `export default Blueprint.adapter({ description, calls, standIn })`, and `export * from "./generated/index.ts";`. Opens `// Scaffolded from abi/. Yours from now on.` |
| `package.json` | scaffold | `@orthograph/<name>`, `"type": "module"`, `"orthograph": { "kind": "adapter" }`, `"exports": { ".": "./src/index.ts" }`, `effect` and `@orthograph/chain-evm` as dependencies, `orthograph` as a peer |

The files are sorted by path. No header names a path outside the folder or a time, so the same ABIs from any path give the same bytes.

## One contract's module, `src/generated/<Contract>.ts`

Everything it exports, for a contract `C`:

| Export | When | What |
|---|---|---|
| `abi` | always | the ABI's items, as `AbiDocument` (from `@orthograph/chain-evm/device`) |
| `bytecode` | bytecode given | `Hex`, the creation code, exactly as given |
| `<Fn>Args` | a function with inputs | an `interface`, one `readonly` member per input, in ABI order, by its name |
| `<Fn>Answer` | every function | no output: `void`; one: its type; several: an `interface` of the named outputs |
| `ConstructorArgs` | a constructor with inputs | an `interface` of its inputs |
| `<Event>EventArgs` | every event | an `interface` of its inputs |
| `<Error>Fields` | an error with inputs | an `interface` of its inputs |
| `<Error>` | every error | `class <Error> extends Data.TaggedError("<Error>")<<Error>Fields> {}` (`<{}>` for none): a revert with its selector, decoded |
| `Refusal` | always | the union of the contract's error classes; `never` when it declares none |
| `Chain` | always | `{ readonly port: ChainPort; readonly address: Address; readonly from?: Address }`: where the contract is |
| `at` | always | `at(chain)`: an object with one call per function (below) |
| `events` | always | one typed `EventSource` per event: `events.<Event>(address: Address, fromBlock: bigint)` |
| `deploy` | bytecode given | `deploy(port, signer, args)` (`args` only with `ConstructorArgs`): deploys, waits for the receipt and answers the `Address` |

A call of `at(chain)`, for a function `f` (an overload is `f_1`, `f_2`, … everywhere: below):

- **A read** (`view` or `pure`): `f(args)` (no argument with no inputs) is an `Effect<FAnswer, Refusal | ChainError>`. One
  `eth_call` (`ChainPort.read`) from `chain.from`, else the zero address; the answer decoded and shaped as `FAnswer`.
- **A write** (any other): `f(args, signer)` (`f(signer)` with no inputs; a `payable` one takes a third, optional
  `{ value: bigint }`) is an `Effect<Submission, Refusal | ChainError>`: `prepare`, then `simulate`, then `sign` and `submit`.
  A revert in simulation whose selector is one of the contract's errors fails as that error's class, with its fields, and
  nothing is sent and no nonce is kept (`release`). Any other revert (a `require` string, a panic, another contract's error)
  fails as chain-evm's own `ChainError`, as it comes.

## The names

`Pascal(x)` is `x` with its first letter upper-cased, nothing else changed.

| Item | Type |
|---|---|
| a tuple parameter `p` inside a type `T` | `T` + `Pascal(p)`: `BoxedB` for `boxed(Box b)`; inside that, `BoxedBInner` |
| a tuple output `p` of `f` | `Pascal(f)` + `Answer` + `Pascal(p)`, or `Pascal(f)` + `Answer` + its position from 1 when unnamed: `BoxedAnswer1` |
| an overloaded name (two or more functions, events or errors of one name) | each is `<name>_<n>`, `n` counted from 1 in ABI order; a name with one member is left as it is |

## The mapping

| ABI | TypeScript |
|---|---|
| `uint<N>`, `int<N>` | `bigint` |
| `address` | `Address` |
| `bool` | `boolean` |
| `string` | `string` |
| `bytes`, `bytes<N>` | `Hex` |
| `T[]`, `T[N]` | `ReadonlyArray<T>` |
| `tuple` | an interface of its named components |
| an `indexed` `string`, `bytes`, array or tuple of an event | `Hex`: the topic's hash is all the log holds |

`Address`, `Hex`, `ChainPort`, `Signer`, `Submission`, `ChainError`, `EventSource`, `DecodedEvent` and `AbiDocument` come from
`@orthograph/chain-evm/device`; the module imports nothing else but `effect`. The descriptor's file imports `orthograph`.

## The descriptor

`calls` is `{ <Contract>: { <f>: Blueprint.call({ mode: "effect" }) } }`, one per function, overloads named as above.
`standIn` is `{ kind: "stand-in", how: "process", what: "<Contract>, …: deployed on the world's Anvil from abi/" }` naming the
contracts with bytecode, or `{ kind: "stand-in", how: "none" }` when none has any. Events as an adapter's `on:` are E1's
(#1165), and the errors as `Blueprint.error`s an operation lists wait on M6.10's refusal codes: not done here.

## What it refuses

`AbiRefused { message }`, nothing made, the message naming the contract and the item (`Probe: function send`):

- a name that isn't lower case words joined by dashes; no contract; two contracts of one name; a contract name that isn't an
  identifier starting with a capital letter (`Probe`, `ERC20`)
- a file that is not an ABI or an artifact holding one; an item with no known `type`; a function, event or error with no name
- a contract with no function and no event
- an unnamed input of a function, event, error or constructor; an unnamed tuple component; an unnamed output of a function
  with several
- two inputs, two outputs or two components of one name
- a type with no mapping (`fixed<M>x<N>`, `ufixed…`, `function`)
- an anonymous event
- bytecode that isn't `0x` and an even number of hex digits
- two generated names that collide (`function transferEvent` and `event Transfer` both make `TransferEventArgs`)

Tests: `abi.test.ts` (the files and the names), `types.test.ts` (the types, through `tsc`), `anvil.test.ts` (the calls against the
fixture's stand-in on Anvil, `ORTHO_CHAIN_EVM_ANVIL=1`), `regenerate.test.ts` (the three adapters regenerate unchanged). The
fixture is `fixtures/Probe.sol`, compiled into `fixtures/Probe.json`. Prior art: parked Goal 12's draft checks (#497,
`goal-12/st2-02-check`), whose names and mapping this keeps.
