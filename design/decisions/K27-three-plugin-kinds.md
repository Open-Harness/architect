# K27: three plugin kinds, a language, a host and a projection, and no target

Decided 20 November 2026 by Aaron, with the 📐 on-chain designer. Asked whether Solidity is a projection or a target,
he said: "Solidity is just a language, so it's probably a projection, but then it has to deploy somewhere ... I'm not
even sure what the target even is". Shown four plain questions (written in what, runs where, which copy, reached how),
with no "target", he answered: "It does, it feels good." Grounded at `origin/goal/stage-1` `67fa0d75`.

This record supersedes K17's "a target is a plugin" (`TargetSpec`). Everything else in K17 stands: the four axes, the
guards table, one grid per language, a private field on a public chain refused, and chains declared in the
environment file. It also makes concrete what K2 (Aaron's call 2: "target" retired) and K5 (language and host) already
said, and `docs/canon/languages-and-hosts.mdx` already teaches.

## The problem, in code

Two design pages give two answers for Solidity. The older one calls it a projection:

```ts
// design/frame/projections.md:364 (3.9)
export const solidity = Blueprint.projection({ host: [Host.chain], takes: …, render, ships: [Deploy.contract] });
```

K17 brought back "target", a place plus a language, as one interface:

```ts
// design/decisions/K17-everything-falls-out.md:106-116
export interface TargetSpec { name; hosts; takes; frame; scaffold; guards; wire; refusal; surface? }
```

Neither is built. The only seam is the projection, whose hosts have no chain
(`packages/orthograph/src/modules/plugins/types.ts:13`). The built server projection does two jobs: it writes the
Effect frame around every handler, and it deploys the Worker. And K17's step 1, "the target interface, with one
implementation" (`K17:307-309`), was decided but never given a slice: `git grep TargetSpec` finds it only in K17 and
the walkthrough.

## Decided

1. **Four questions, four words.** Every piece of generated code answers four questions, and each has its own word:

   | Question | Word | Examples |
   |---|---|---|
   | What is it written in? | **language** | Effect, Solidity; later Noir and Python |
   | Where does it run once deployed? | **host** | `host-cloudflare`, `Host.node`, `Host.browser`, `Host.chain` |
   | Which copy of that place? | **environment** | Anvil, Base Sepolia, Base |
   | How do people reach it? | **projection** | the SDK, CLI, MCP, docs, portal |

   "Target" is not one of them. It was retired by K2, and K17's return of it is superseded here.

2. **Three of them are plugin kinds.** `Blueprint.language` and `Blueprint.host` join `Blueprint.projection`, and
   with the feature and the adapter a plugin is now one of five kinds. An environment stays a file, not a plugin.

   ```ts
   // what a language owns: the code it writes, and what that code needs
   export const solidity = Blueprint.language({
     frame, scaffold, surface,          // BudgetsBase.sol ("Do not edit"), src/Budgets.sol ("Yours"), surface.json
     refusal,                           // a code's wire identity, from blueprint/refusals.lock
     guards,                            // what it enforces before and after the body (K17's guards table)
     writesFor: ["chain.evm"],          // the store kinds its code is written for; it supplies none
   });

   // what a host owns: where code runs, how it is reached, how it is deployed; mounted as `Host.chain`
   export const chain = Blueprint.host({
     supplies: ["chain.evm"],           // the store kinds of its place, with their store port
     wire: "chain",                     // how a projection reaches it: a signed transaction
     deploy,                            // only when the bytecode hash changes
   });

   // a projection stays a face: one shape, whatever runs behind it
   export const sdk = Blueprint.projection({ render });   // reads each operation's wire from its host
   ```

3. **Nobody picks a language or a host per operation; they fall out.**
   - The thing's store kind and the operation's `runs` decide them: a thing in a chain store gets Solidity on
     `Host.chain`, and an operation that runs on the server gets Effect on `host-cloudflare`.
   - Every operation is taken by exactly one language on one host. The compiler refuses an operation that none takes,
     or that two take.

4. **Each job has one owner.**
   - **The language** owns the frame, the scaffold, the guards, the refusal codes on its wire and the small library its
     generated code imports.
   - **The host** owns the place, the wire, the deploy, and the services the language asks for: a store, a clock,
     telemetry.
   - **The projection** owns the face. "A language never chooses where it runs, and a host never gives an operation
     meaning" (K5) still holds.

5. **A host supplies store kinds; a language writes for them.** Store kinds come from what is mounted, not from a
   fixed list in the compiler (`compiler/.../stores.ts:10`), and each has one owner:
   - **The host supplies** the kinds of its place, with the store port that commits there: `host-cloudflare` supplies
     `database` and `actor`, as it already implements the store over D1
     (`packages/host-cloudflare/src/modules/store/service.ts:11`); `Host.chain` supplies `chain.evm`.
   - **The language writes for** kinds and supplies none: Effect writes for `database` and `actor`, Solidity for
     `chain.evm`.
   - `chain` stays a family, one member per chain (`chain.evm`, later `chain.solana` and `chain.aztec`), and
     `Blueprint.store.chain.evm()` names the member (K25).
   - The compiler accepts a store only when a mounted host supplies its kind and a mounted language writes for it.

   This replaces one line of K3 and K7: they had each chain kind supplied by its language package
   (`language-solidity`). K3 and K7 gain dated notes; everything else in them stands.

6. **Effect moves first, and nothing visible changes.**
   - `language-effect` becomes the Effect language, served by `host-cloudflare` and, for the CLI, `Host.node`.
   - The server projection keeps only its face, and the deploy moves to `host-cloudflare`.
   - This is slice 1 of Goal 4. Goal 4's file, `design/goals/04-on-chain.md`, is written when its branch
     `goal/on-chain` is cut, after K25 and K26 land (K26 item 4). Its check: acme's generated
     files come out byte-identical.
   - Solidity is the second language on the same seam.

## Not chosen, and why

- **Solidity as a projection** (`projections.md` 3.9): the SDK, CLI and MCP would each learn "this one is on a chain"
  by hand, and again for every new language.
- **A projection with a `language` field:** "projection" would keep two meanings, and nothing would refuse an
  operation that two of them take.
- **`TargetSpec`** (K17): it bundles a language with a place in one word, which K2 had retired, and Aaron found it
  unclear.

## What it touches

| Dependent | Change |
|---|---|
| `orthograph`: plugins | `Blueprint.language` and `Blueprint.host` beside `Blueprint.projection` (Goal 4, slice 1) |
| `compiler` | folds in languages and hosts; store kinds come from them; one language and one host per operation |
| `projections`: server | keeps its face; its Effect frame moves to `language-effect`, its deploy to `host-cloudflare` |
| `language-effect`, `host-cloudflare` | the first language and the first host |
| `language-solidity`, `Host.chain` | the second of each (Goal 4) |
| K3, K7 | dated notes beside "supplied by `language-solidity`": the host supplies, the language writes for |
| K17 | dated notes beside `TargetSpec` and its build step 1 point here |
| `frame/projections.md` (opening, 3.9), the allowance example, the walkthrough, `design/state` | rewritten here |
| `docs/canon/languages-and-hosts.mdx`, `stores.mdx`, `data.mdx` | who supplies `chain`, rewritten here |
| `frame/README.md` (with the proof each kind brings), `frame/mounting.md`, the walkthrough | five plugin kinds |
| `design/docs/index.html` | five plugin kinds; Python leaves the projection examples, a language for later |
| `docs/canon/plugins.mdx`, `docs/canon/orthograph.mdx`, `docs/canon/outline.md` | five plugin kinds, rewritten here |
| ledger `LAH-04`, `X-18`, `AZ-02`, `PRJ-12` | reworded to item 5 and item 2 |

Left for their owners. Goal 4's file copies this list into slice 1 when it is written:

- **The canon thread**, `docs/canon/languages-and-hosts.mdx`: this change rewrites who supplies `chain` there and in
  `docs/canon/stores.mdx`. Line 139 still quotes the package's "the Solidity target", checked against the file, so it
  changes with the package. The canon thread adds `Blueprint.language` and `Blueprint.host` when slice 1 is built.
- **Goal 4, slice 1**: `packages/language-solidity` (its `README.md` and the comment in `src/index.ts`) still say
  "The Solidity target"; the slice rewrites them with the package, and the walkthrough's quote of that file
  (`design/walkthrough/journey.md:1684`) with them. Ledger `G-02` tracks the word.
- **Dated records keep their words.** K20 (line 169, "the Solidity target is an empty package") gains a dated note
  here. `design/noir/spike-1-member-note.md:440` is a spike's dated note, quoted as run, and stands.

## Ledger

- `PRJ-12` (the Solidity projection and the chain adapter mount automatically): reworded to the Solidity language and
  the EVM host, which mount when a thing first lives in a chain store. Built in Goal 4.

## Supersedes

- design/frame/projections.md (3.9): "export const solidity = Blueprint.projection({" → "export const solidity = Blueprint.language({"
- design/frame/examples/allowance-on-chain.md: "The Solidity projection" → "The Solidity language"
- design/frame/examples/allowance-on-chain.md: "mounts added: projection solidity (automatic), adapter chain (needed by lives: chain)" → "mounts added: language solidity and host chain (automatic, needed by the chain store)"
- design/walkthrough/journey.md: "export interface TargetSpec {" → "Blueprint.language({ … }) and Blueprint.host({ … }) (K27)"
- design/walkthrough/journey.md: "The Solidity target is M6" → "The Solidity language is M6"
- design/frame/examples/allowance-on-chain.md: "`@orthograph/language-solidity` plus the solidity projection" → "`@orthograph/language-solidity` on `Host.chain`"
- design/frame/projections.md (3.9): "storeKinds: ["chain:evm"]" → "writesFor: ["chain.evm"]"
- design/state/index.html: "The Solidity target, signed operations, a vault per organisation on Anvil." → "The Solidity language, signed operations, and a Safe that enables the budgets module, on Anvil."
- design/frame/projections.md: "the docs, the portal, the contracts and the keeper are all projections" → "the docs, the portal and the keeper are all projections"
- docs/canon/languages-and-hosts.mdx: "and `chain` is the store kind that runs on it, supplied by `language-solidity` (K3" → "and `chain` is the store kind that runs on it. The host supplies the kind"
- docs/canon/languages-and-hosts.mdx: "supplied by `language-solidity` (K3 item 2, K5 decision 8)" → "supplied by the host and written for by `language-solidity`"
- docs/canon/stores.mdx: "| `@orthograph/host-cloudflare` | `@orthograph/language-solidity` |" → "| `@orthograph/host-cloudflare` | `Host.chain`, written for by `@orthograph/language-solidity` (K27) |"
- design/frame/README.md: "Solidity is a projection onto a chain." → "Solidity is a language on a chain host (K27)."
- design/docs/index.html: "There are three kinds, and the" → "There are five kinds, and the"
- design/docs/index.html: "builder, agents, solidity, python</td>" → "builder, agents</td>"
- design/walkthrough/journey.md: "There are three kinds: a **feature**" → "Three kinds work today: a **feature**"
- docs/canon/plugins.mdx: "What is a plugin, and what are its three kinds?" → "What is a plugin, and what are its five kinds?"
- docs/canon/plugins.mdx: "| the three kinds, the four verbs, choices and settings |" → "| K2's three kinds (feature, adapter, projection), the four verbs, choices and settings |"
- docs/canon/plugins.mdx: "The three kinds and the mount API are K2's frame." → "K2's frame is the first three kinds and the mount API; K27 adds the language and the host."
- docs/canon/orthograph.mdx: "Plugins come in three kinds: features, adapters and projections." → "Plugins come in five kinds since K27: features, adapters, projections, languages and hosts."
- docs/canon/outline.md: "the three kinds and the one-file mount" → "the five kinds and the one-file mount"
- docs/canon/outline.md: "What are the three kinds, and how do I pick?" → "What are the five kinds, and how do I pick?"
- design/frame/mounting.md: "one way for all three kinds" → "one way for every kind"
- docs/canon/data.mdx: "on it is `chain`, supplied by the Solidity language." → "store kind that runs on it is `chain`, supplied by `Host.chain` and written for by the Solidity language (K27)."
- design/ledger.md (AZ-02): "and `aztec` is the store kind it supplies," → "and `aztec` is the store kind it writes for (K27: the host supplies it),"
