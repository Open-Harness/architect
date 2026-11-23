---
goal: 4
title: on chain, end to end
milestone: "Goal 4: on chain, end to end"
release: 1.0
branch: goal/on-chain
base: goal/stage-1
status: running        # ready | running | landing | done | parked
lead:
  harness: claude
  model: claude-opus-5-5
  since: 2026-11-21
done_check: nx run e2e:on-chain
owns:
  - examples/budgets/
  - e2e/on-chain/
  - design/goals/04-on-chain.md
  - design/goals/04-snags.md
  - .agents/skills/goal-4/
  - design/decisions/M6-chain.md
  - design/decisions/M6-money.md
slices:
  - "0 · K27, the three plugin kinds"
  - "1 · the language and host seam, on Effect alone"
  - "1b · M6.01, the chain decision"
  - "2 · M6.02, the budgets journeys and the e2e:on-chain done check (after 1b)"
  - "3 · M6.10, the chain store, values and money (after 2)"
  - "3b · chain-evm's ABI codec and a read that returns data, for Goal 12"
  - "9 · M6.07, the relayer actor (after 3)"
  - "10 · M6.09, the follower actor, landed early for Goal 9 (after 9)"
  - "4 · M6.11, the Solidity language renders the base contract and surface.json (after 3)"
  - "5 · M6.12, the scaffold and the Foundry tests (after 4)"
  - "6 · M6.13, the user fills the hook; the fuzz (after 5)"
  - "7 · Host.chain and the safe adapter (after 6)"
  - "8 · M6.14, the client from surface.json (after 7)"
  - "11 · M6.15, the signing flow and the submission lifecycle (after 8, 10)"
  - "12 · M6.16 to M6.18, worlds with a chain, redeploy on new bytecode, key hygiene (after 11)"
---

# Goal 4: on chain, end to end

`design/goals/04-on-chain.md`, on `goal/on-chain`, cut from `goal/stage-1` at `9f855a91` on 20 November 2026, after
K25, K26 and K27 landed there. The number came from the conductor.

**Start, in any harness:** "You lead Goal 4. Read `AGENTS.md` and `design/goals/04-on-chain.md`, and run it." The lead's
way of working and its live state are the `goal-4` skill (`.agents/skills/goal-4/SKILL.md` and `STATE.md`). Goal 4
coordinates through git and GitHub (K32, K33): its milestone (`Goal 4: on chain, end to end`), the `goal-4` label and the
`release:1.0` label on every pull request and issue; the front matter above is what the sync reads (K33 item 5). New
snags are Snag issues in the milestone; `04-snags.md` stays as the record of S-01 to S-12. Every comment Goal 4's
agents post on GitHub starts with `[goal-4 · <role> · claude · <model>]`.

## The goal, in plain words

- **In one sentence:** Let an app keep some of its records on a blockchain, written in the same description as the
  rest of it, so its contract, its client and its tests come from that description too.
- **Why:** Capxul pays people from a shared wallet (a Safe) within limits. Today that contract and its client would be
  written by hand beside the app, and nothing would keep them in step with the app's own rules.
- **When it's done, you can:** describe an allowance (who may spend how much of which token from which Safe), write one
  small rule in Solidity, and run the budgets example's journeys on a local chain: grant, spend within the limit, be
  refused over it, revoke, each signed by the person who does it.
- **It is:** a chain store, values with their Solidity types and money that knows its asset, the Solidity language that
  writes the contract, a host that deploys it, the `safe` adapter, the client, a relayer and a follower, and the
  budgets example that proves them.
- **It isn't:** hats, owner signatures above a budget, agents spending, time on chain, a public test chain, Solana or
  Noir, or the portal's chain views.
- **Done when:** `nx run e2e:on-chain` passes in CI on `goal/on-chain`: every slice's check, every budgets journey on
  Anvil, acme's and Plugged In's generated files unchanged, and every snag fixed or parked.
- **Waits on:** slice 1 waits for Goal 3's sign-in extraction (M2.05). Everything else can run.

## Where it stands

Rewritten by the lead at every merge into `goal/on-chain` (K32); `.agents/skills/goal-4/STATE.md` has the detail.
23 November 2026:

- **Landed:** slices 0, 1b and 2 (K27; [#275](https://github.com/Open-Harness/orthograph/pull/275); [#276](https://github.com/Open-Harness/orthograph/pull/276), [#279](https://github.com/Open-Harness/orthograph/pull/279)); money, M6-money ([#287](https://github.com/Open-Harness/orthograph/pull/287)); slice 3, M6.10,
  the chain store, values and money, and the refusals lock ([#283](https://github.com/Open-Harness/orthograph/pull/283), [#331](https://github.com/Open-Harness/orthograph/pull/331)); the relayer and follower decision,
  M6-chain item 12 ([#518](https://github.com/Open-Harness/orthograph/pull/518)); the checks for the relayer and the follower ([#513](https://github.com/Open-Harness/orthograph/pull/513)); `goal/stage-1` again
  ([#663](https://github.com/Open-Harness/orthograph/pull/663)), which brought the draft-race fix and the fast gate. On `goal/stage-1` directly: slice 3b, the ABI codec
  Goal 12 asked for ([#509](https://github.com/Open-Harness/orthograph/pull/509), [#521](https://github.com/Open-Harness/orthograph/pull/521)).
- **Building:** slice 9, the relayer, and slice 10, the follower, each a Durable Object, one builder each.
- **Order changed (K38):** the relayer and the follower now come straight after slice 3, before slices 4 to 8, because
  Goal 9 needs M6.09 early (#442) and they need only `chain-evm` and Anvil. M6.09 lands early into `goal/stage-1`.
  The follower hands Goal 11's `Inbox.accept` only what it confirmed: `Confirmed`, and `Corrected` with
  `wasConfirmed: true` (#481, M6-chain item 12).
- **Waits on:** slice 1 waits for Goal 3's sign-in extraction (M2.05) on `goal/stage-1` (K28). Snags S-01 to S-12 are
  open, each naming its slice. Ask #674 is with Goal 9.

## The paths Goal 4 owns

`examples/budgets/`, `e2e/on-chain/` (its checks, by their authors), `design/goals/04-on-chain.md`,
`design/goals/04-snags.md`, `.agents/skills/goal-4/`, `design/decisions/M6-*.md`, and the new packages its slices
make (`language-solidity`, `host-chain`, the `safe` adapter). The engine packages (`orthograph`, `compiler`,
`generators`, `projections`, `language-effect`) and `chain-evm` are shared: Goal 4 changes them on this branch
(K26 item 4) and keeps Goal 3's intent where they meet. Anything else, another goal's path above all, is a cross-goal
ask: an issue labelled for that goal (K32 item 3), never a quiet edit.

## Aaron's words, 20 November 2026

"Can we actually build this now? Separately from the goal that's running ... I want to run a goal, but like a bounded
one ... we need to be able to use this as a trial of the new DX as well, of these new three plugin types ... and
obviously we want to spike the actual system itself."

Then: "What if we were to re-cut the main goal and take ownership over the engine? ... how can we make this one proper
goal that completes something end to end properly?" Offered Part 1 alone or both parts, he answered: "Both parts".

## What this goal proves

Orthograph's promise reaches a chain. A person writes a blueprint and one rule in Solidity, and everything else falls
out: the contract, its tests, a fuzz against the TypeScript machine, the deploy, and an SDK call that signs, sends and
confirms. It proves four things:

1. **Three plugin kinds carry it.** A **language** (Effect, Solidity) writes the code. A **host** (`host-cloudflare`,
   `Host.node`, `Host.chain`) is where that code runs, and it deploys it. **Projections** (SDK, CLI, MCP, docs,
   portal) are the faces people meet. Nothing is called a target: the language and the host fall out of where a thing
   lives.
2. **Effect didn't move.** Today's Effect output comes through the new kinds byte for byte the same.
3. **The chain agrees with TypeScript.** The same machine runs in both, and the fuzz finds no difference.
4. **It runs.** On a local chain, a real Safe enables our budgets module. A member's signed spend goes through the
   relayer and is confirmed by the follower, and a wrong signer is refused before anything is sent.

The DX itself is on trial. Every snag is written down and becomes a fix.

## The words (agreed with Aaron, 20 November 2026)

- **Language:** what code is written in. It renders the generated code, the scaffold and the refusal codes, and holds
  the small library the generated code imports.
- **Host:** where code runs once deployed. It knows how to deploy, and supplies the store kinds of its place; a
  language writes for them (K27 item 5).
- **Environment:** which copy of the host (Anvil, Base Sepolia, Base). Bindings only.
- **Projection:** a face people meet, the same shape whatever runs behind it.
- **The organisation is not on chain; an account is** (K25 item 7). Our contract is one module per network, which any
  Safe enables.

## The prompt

> You lead Goal 4 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/on-chain`, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/milestones.md` (M6, and the K26 paragraph after the stage table);
> - in `design/decisions/`: K7, K17, K20, K23, K25 (the blueprint on chain), K26 (this goal's branch) and K27 (the
>   three plugin kinds);
> - `docs/canon/languages-and-hosts.mdx`, which K27 builds on;
> - `design/frame/examples/allowance-on-chain.md` and `spikes/chain-languages/` (its README and `evm/`);
> - the `conductor`, `reviewer`, `author`, `threads` and `kanban` skills.
>
> - **Branch:** `goal/on-chain`, cut from `goal/stage-1` at `9f855a91`.
>   - Every change reaches it through a pull request into `goal/on-chain`. Merge each one when CI is green and a 🔍
>     reviewer that wrote none of it has passed it.
>   - Merge `origin/goal/stage-1` into `goal/on-chain` at the start of every slice: by a merge, never a rebase. Never
>     push to `goal/stage-1`.
>   - Goal 3 owns `goal/stage-1` and never waits on you. Resolve every conflict on your side, keeping Goal 3's intent.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same slice.
> - **Ownership:** you own the architecture, as `AGENTS.md` says. Where code and design disagree, decide, fix the
>   other in the same change, and record it.
> - **The handoff:** rewrite "Where it stands" above and `.agents/skills/goal-4/STATE.md` for every merge into
>   `goal/on-chain`: in the pull request that merges, or the next one when CI-drafts folds the note in, but always
>   before the next slice starts. So a fresh or compacted session, in any harness, continues where you stopped. The conductor keeps
>   `.agents/skills/kanban/STATE.md` and the board from these; never edit them.
> - **At every slice start:** read the open issues in Goal 4's milestone, Ask issues above all, and the open pull
>   requests into `goal/on-chain` (`gh issue list --milestone "Goal 4: on chain, end to end"`, `gh issue list --label goal-4`,
>   `gh pr list --base goal/on-chain`); close each issue with the pull request that answers it.
> - **Reporting:** through these files and GitHub, not a chat (K32). A slice's merge says, in its pull request and in
>   "Where it stands", the slice, its check and its snags, written for Aaron's ear. A message to the conductor is
>   welcome where both can reach each other, but nothing depends on it: what a message settles goes into a file or an
>   issue.
> - **Branch protection:** `goal/on-chain` is protected like `goal/stage-1` since 21 November 2026, admins included
>   (`design/decisions/CI-branch-protection.md`): its CI jobs must pass and every conversation be resolved. Never push to
>   `goal/on-chain` directly.

## The bound

- **Inside:** slices 0 to 12 below, the framework work they need, and the new example `examples/budgets`, which this
  goal owns. Changing the engine packages (`orthograph`, `compiler`, `generators`, `projections`, `language-effect`)
  is allowed on this branch (K26 item 4).
- **Outside:**
  - `examples/plugged-in` and Goal 3's journeys and checks;
  - hats, owner signatures above a budget, and agents (stage 3's other pieces);
  - time on chain (M6.21 waits for M8.09);
  - Noir, Solana and the portal's chain views.
- **Local, never fake:**
  - Anvil runs as a plain local process, and so do workerd and D1.
  - No cloud, no Docker, no keys: the world makes its own funded keys.
  - A public test chain would need a funded key, which only Aaron can give. It stays out.
- **Dependencies:** Safe's contracts come from a published release, pinned exactly, at least three days old (R1).
  OpenZeppelin 5.x likewise.
- **Goal 3's hotspots** (the conductor, 20 November 2026). Goal 3 is reshaping shared seams right now, so merge
  often, and keep each slice small where it touches them:
  - the invariants (ST1.12, ST1.14 to ST1.17): `Blueprint.invariant` and `machine.states.<state>` in `orthograph`, an
    invariant block in the compiler's model, and rules checked inside `language-effect`'s handler;
  - G4's spelling retired (ST1.20): never write `unique:` or the old `findBy` in any fixture, example or generator on
    this branch; use the invariant form from the start;
  - ST1.12: `language-effect`'s handler orders its writes, freeing before taking, and a cycle or clash the call makes
    itself is a defect naming the rule; `host-cloudflare`'s memory store applies writes one at a time. Slice 1 moves
    that handler into the Effect language, so it lands after ST1.12 merges, or merges it in first;
  - ST1.14 (#230), in detail: on a machine object, `machine.states` is now a record of state references, and the list
    of declared states is `machine.declared`. Code that reads a machine directly (`states.map`, `states.includes`)
    reads `declared`; `model.json` still carries `machine.states` as a list. After each merge-in, grep the chain store,
    the Solidity language and the chain host for direct `machine.states` reads. `Records.findBy(rule, value)` fails at
    runtime until ST1.16, so use the old form until then;
  - ST1.15 (#233, the invariants in the model): `things.<t>.invariants.<rule>` is `{ kind: "unique", fields,
    while?, refuse?, description? }`, and `operations.<op>.invariants` maps a refusal to its rule's full name
    (`"HandleTaken": "handle.oneHolderPerName"`); both appear only when there are rules, and the hashes cover them.
    `operations.<op>.refusals` now lists the rule refusals right after the `errors`, never inside them. A blueprint
    without `invariants.ts` is byte-identical. Until a slice builds an on-chain index with a revert carrying the
    rule's refusal, the Solidity language refuses to compile a chain-stored thing that has `invariants`, naming it,
    rather than ignore the rule;
  - ST1.16 (next, the runtime and the stores) touches `language-effect`; Goal 3 warns before it merges;
  - ST1.14: the front door gains `machine.states.<state>` as references, fields whose type carries their key and
    thing, `Blueprint.invariant.unique`, and the type of `Records.findBy(rule, value)`. Slice 1's `Blueprint.language`
    and `Blueprint.host` sit beside them in `orthograph`, so merge before touching the plugins module;
  - the expected-failure lists.
- **Cloud spend: $0.** Local only, with no keys.
- **At most three builders at once.** Every agent stops the processes it starts, by PID, before it reports.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Journey author** | `examples/budgets/blueprint/` and its journeys (M6.02): the spec, as a user would write it | handlers, the framework, `src/` |
| **Checks author** | each slice's failing check, first, on a `-check` branch | handlers, the framework, the journeys |
| **User** (the DX trial) | only `examples/budgets/src/`, including `src/Budgets.sol`, using only what a user has: the scaffold, `ortho`, the generated docs | the blueprint, the journeys, `packages/`, any check |
| **Framework builder** | `packages/`, on a `-build` branch, to turn a check green | the journeys, any check, the user's `src/` |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the user is stuck on something it can't fix inside `src/`, it writes a snag in `design/goals/04-snags.md` and
moves on. It never works around the framework. The lead creates `04-snags.md` in slice 1, in the shape of
`03-snags.md`; each entry looks like this:

```md
## S-03 · budgets · "the hook can't read the Safe"
- Hit: the user, filling `src/Budgets.sol`: the scaffold's `_spend` gets the allowance but not its Safe.
- Lost: 3 tries, 10 minutes.
- Cause: the base contract passes only the row to the hook.
- Fix: framework, the Solidity language passes the account to every hook (PR #…). Docs: the scaffold's brief.
- Status: fixed
```

## The slices

Each slice starts with its check, written first and failing, and ends with that check green on `goal/on-chain`. The
M6 checks in `design/milestones.md` were written for acme's allowance vault ("0 passed · 24 failed", "24 passed"); the
checks author rewrites each for the budgets module before its slice starts, keeping what it proves.

### Part 1: on Anvil, end to end

| # | Slice | Done when |
|---|---|---|
| 0 | **K27, the three plugin kinds.** Recorded before the goal started (K27). Nothing to build; read it | done |
| 1 | **The seam, on Effect alone.** `Blueprint.language` and `Blueprint.host` in `orthograph`. Effect becomes a language served by `host-cloudflare` and `Host.node`. The server projection keeps only its face. Hosts supply store kinds and languages write for them, not a fixed list (`compiler/.../stores.ts:10`, K27 item 5). Rewrite `packages/language-solidity`'s "Solidity target" wording and the walkthrough's quote of it | acme's generated files are byte-identical; the compiler refuses an operation that no language takes, or that two take |
| 1b | **M6.01, the chain decision**, by the lead, beside slice 1 and before slices 2 to 8. K7 and K25 settle most of it; what is left is `signedBy` as EIP-712 typed data, values across languages (the rest of D5), and the exact schemas of `surface.json` and `blueprint/refusals.lock`, which separate authors and builders produce and consume | `design/decisions/M6-chain.md` written, with the evidence, and a 🔍 has passed it |
| 2 | **M6.02, the journeys** for `examples/budgets` (the journey author, beside slice 1, once 1b has passed). The checks author adds the `e2e:on-chain` target: every slice's check and the budgets journeys, red until each turns green | they fail on empty handlers; `nx run e2e:on-chain` runs and fails |
| 3 | **M6.10, the chain store and values.** `Blueprint.store.chain.evm()`, `Blueprint.account()`, Solidity types worked out from values, money (`Blueprint.money`, `Blueprint.asset`, M6-money) and `blueprint/refusals.lock` | M6.10's check |
| 3b | **`chain-evm`'s ABI codec and `ChainPort.read`**, for Goal 12 (#471): `Abi.encodeCall`, `decodeResult`, `encodeDeploy`, `refusal`, and a plain `eth_call` that returns its data. Cut from `goal/stage-1` and landed there directly (K38) | its tests in `chain-evm` pass, `read`'s on Anvil |
| 4 | **M6.11, the Solidity language renders** the base contract (role, machine, hook, account, event), roles behind `IAccessControl`, and `surface.json` | M6.11's check; a fixture with a chain-stored thing that has an invariant fails to compile, naming the thing |
| 5 | **M6.12, the scaffold and the Foundry tests** | M6.12's check: the scaffold's tests fail as not written |
| 6 | **M6.13, the user fills the hook; the fuzz** | M6.13's check: every test passes, the fuzz finds no difference, the planted mutant diverges |
| 7 | **`Host.chain` and the `safe` adapter.** Deploy the module to Anvil; a Safe from its release enables it; `_execute` goes through the adapter. This is the Safe-and-Anvil half of M6.16, done early; its worlds and M6.17's redeploy rule come in slice 12 | a spend within the allowance pays from the Safe on Anvil; one over it reverts with its refusal code |
| 8 | **M6.14, the client from `surface.json`**: simulate, sign and submit directly through `chain-evm` | M6.14's check, and an SDK spend is included on Anvil |

Slice 1 also carries what K27 left for it:
- `packages/language-solidity`'s `README.md` and the comment in `src/index.ts` still say "The Solidity target"; rewrite
  them with the package, and with them the quotes of that file in `design/walkthrough/journey.md` and
  `docs/canon/languages-and-hosts.mdx` (ledger `G-02`).
- Tell the canon thread, through the conductor, when `Blueprint.language` and `Blueprint.host` are built, so the canon
  pages can show them.

### Part 2: running for real

Slices 9 and 10 run before slices 4 to 8 (K38, #442): they need only `chain-evm` and Anvil, and Goal 9 needs M6.09
early. Slice 11 waits for both 8 and 10. Slice 1 (held on M2.05) reshapes `host-cloudflare`, where Durable Objects
live today: the builders of 9 and 10 read slice 1's state first and keep the actors out of what slice 1 moves, or
say where they collide.

| # | Slice | Done when |
|---|---|---|
| 9 | **M6.07, the relayer actor.** Not written from scratch: a Durable Object that holds the relayer key and wraps `chain-evm`'s nonce allocator, transaction manager, replacement and tracker (adapted from `@prb/effect-evm`) | M6.07's check |
| 10 | **M6.09, the follower actor.** A Durable Object around `chain-evm`'s reliable event stream (backfill, cursor, decoder), storing its checkpoint | M6.09's check |
| 11 | **M6.15, the signing flow**, the in-between state and the submission lifecycle, through the relayer | M6.15's check, and an SDK spend is confirmed by the follower |
| 12 | **M6.16, M6.17 and M6.18: worlds with a chain, redeploy on new bytecode only, and key hygiene.** `ortho prove --env local` runs every budgets journey on Anvil | M6.16's, M6.17's and M6.18's checks |

## Decision IDs

Goal 4 names its calls by milestone or area and a slug (`M6-chain`, `M6-money`), or `GOAL4-<slug>` for a call that
belongs to this goal and no milestone (K32 item 4). The lead keeps this list. Before using a name, check that no file
starts with it on `main` or any open branch (`git ls-tree -r --name-only origin/<branch> design/decisions/`).
Lettered IDs (`K32`) come only from the conductor's list in `design/handoff.md`, for calls that cross goals.

| ID | File | Taken by |
|---|---|---|
| M6-chain | `design/decisions/M6-chain.md` | slice 1b, the chain decision (named by M6.01) |
| M6-money | `design/decisions/M6-money.md` | the lead, money (ledger THI-07), Aaron's answers of 21 November 2026; built in slice 3 |

## The done check

```bash
nx run e2e:on-chain
```

It passes only when all of these hold, in CI on `goal/on-chain`:
- every slice's check is green;
- every `examples/budgets` journey is green in `local`, each operation signed by its person;
- acme's and Plugged In's generated files are unchanged by the seam;
- every snag in `04-snags.md` is fixed, or parked with an owner and a reason.

## Landing

When the done check passes, open one pull request from `goal/on-chain`: into `main` once stage 1 is there, or into
`goal/stage-1` if Goal 3 is still open (K26 item 4). Merge `goal/stage-1` in first, by a merge. It merges when CI is
green, `nx run e2e:on-chain` passes on it, and a 🔍 reviewer has passed the whole branch, reading this file, the snag
log, each slice's check and the evidence below. Then tag `budgets/on-chain`.

### Early landings (K38)

A slice another goal needs lands early (`design/decisions/K38-early-landing.md`, AGENTS.md). Once its check is green on
`goal/on-chain`, cut `goal/on-chain-early-<slice>` at the commit that ends it, merge `goal/stage-1` in by a merge, and
open one pull request into `goal/stage-1`. Merge it by a merge commit once CI is green, threads are resolved and a 🔍
has passed. It carries the slices before it, each already green. Never cherry-pick or rebase. Then merge
`goal/stage-1` back into `goal/on-chain`.
- **M6.09 (slice 10)** lands early for Goal 9's M8.17 (#442), with slices 1b, 2, 3, 9 and 10.
- **Slice 3b** (the ABI codec, #471) needs none of Goal 4's slices, so it is cut from `goal/stage-1` and lands there
  directly.
- **M6.21** (time on chain) builds once Goal 9 lands M8.09 early (#444).

## Evidence for Aaron

- **The DX trial:** what a person writes, in full (the blueprint and `src/Budgets.sol`), and a recorded terminal session
  from `ortho generate` to a confirmed spend.
- **The snag log,** each snag linked to its fix.
- **Each slice's check,** with its run.

## Estimate

From Goal 3's pace (a medium slice takes three to six hours from opening to merge, checks first). The chain plumbing is
already built in `chain-evm`: nonces, transactions, replacement, tracking, simulation, the event stream and Anvil. So
the actors are wiring, not new machinery.
- Part 1: about 18 to 26 hours.
- Part 2: about 8 to 12 hours.
- Both: about 26 to 38 hours of continuous running.
