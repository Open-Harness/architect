# generate

An ABI's JSON in, the files of an adapter package out (`design/decisions/ST2-abi-adapters.md`, sections 2 and 5). Pure: no chain,
no file read. `AbiAdapters.parse(json)` reads an ABI file's JSON as items; `AbiAdapters.plan({ name, abiFile, abi, bytecode? })`
answers the files. `ortho new adapter <name> --from-abi <file>` (Goal 3's) calls both and writes what `plan` answers.

## The files

Sorted by path. Generated files open `// Generated from <abiFile>. Do not edit.`; the adapter opens
`// Scaffolded from <abiFile>. Yours from now on.`

| Path | What |
|---|---|
| `adapter.ts` | the descriptor: `Blueprint.adapter({ calls, events, standIn: Stand.process(...) })`, a `Blueprint.call({ mode: "effect", errors })` per function, `errors` every declared error class |
| `generated/types.ts` | one interface per function's arguments, per event's arguments and per error's fields; one type per function's answer |
| `generated/calls.ts` | one `effect`-mode callable per function: a `view` or `pure` one is `Contract.read`, any other `Contract.write` |
| `generated/events.ts` | one typed source per event: `export const Transfer = (address, fromBlock) => AbiEvents.source<"Transfer", TransferEventArgs>(...)` |
| `generated/errors.ts` | one `Blueprint.error` class per error (a distinct `exit` code each), `DeclaredError` (their union) and `bindings` (`ErrorBinding`, code `<name>.<Error>`) |
| `generated/stand-in.ts` | only when `bytecode` is given: `export const bytecode: Hex = "0x..."` |

Imports are only what the file uses (a file with no `address` imports no `Address`). The same input gives the same text.

## The names

`Pascal(x)` is `x` with its first letter upper-cased, nothing else changed.

| Item | Type | Shape |
|---|---|---|
| function `f`, inputs | `<Pascal(f)>Args` | `interface`, one `readonly` member per parameter, in ABI order, by parameter name. None for a function with no inputs, whose callable takes no argument |
| function `f`, outputs | `<Pascal(f)>Answer` | one output: `type X = <its type>`; none: `type X = void`; several: an `interface` of the named outputs |
| event `E` | `<E>EventArgs` | `interface` of its parameters |
| error `E` | `<E>Fields` | `interface` of its parameters |
| a tuple parameter `p` of a type `T` | `<T><Pascal(p)>` | `interface` of its components, in order; a tuple inside a tuple appends its own name (`KitchenSinkPairInner`) |

An overloaded name (two or more functions, events or errors with one name) names each member `<name>_<n>`, `n` counted from 1 in ABI
order; a name with one member is left as it is.

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
| an **indexed** `string`, `bytes`, array or tuple of an event | `Hex`: the topic hash is all the log holds |

`Address` and `Hex` come from `@orthograph/chain-evm/device`.

## What it refuses

`AbiRefused { item, reason }`, `item` naming the function, event or error (`function sendPair`, `event Quiet`). Never guessed:

- an unnamed tuple component; an unnamed input of a function, event or error; an unnamed output of a function with several
- two parameters (or two outputs) of one name
- a type with no mapping (`fixedMxN`, `function`)
- two items whose generated type names collide (`function transferEvent` and `event Transfer` both make `TransferEventArgs`), or an overload suffix that collides with another name

Not decided here (ST3.04 decides it with the `safe` adapter): a `payable` function. `plan` may refuse it, item named, until then.
