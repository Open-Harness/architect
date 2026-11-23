# G5: invariants are their own kind of declaration

Decided 19 November 2026. Aaron chose the kind ("I agree with your recommendation. I think invariant should be their own
thing", option C of the conductor's grill). The 📐 invariants designer settled the spelling and the rest under "Who
decides" in `AGENTS.md`, from seven read-only traces of the code at `goal/stage-1` `a2d29b10` (line numbers here
are at that commit; a builder re-finds them on the slice's branch). It **supersedes G4's
spelling** (`unique:` on `Blueprint.thing`, `Records.findBy(thing, "name", value)`) and **keeps G4's runtime**: the rule
holds at commit, a store conflict retries, and no race lets two holders win. It also settles snag S-19 (ledger
`HAN-18`). The portal and docs pages are not drawn here: their questions are in
[`G5-invariants-ui-grill.md`](G5-invariants-ui-grill.md), answered 1A 2A 3A 4A on 20 November 2026.

## The problem, in code

G4 made "is this name taken?" answerable, but in a shape with three faults.

```ts
// e2e/fixtures/m1/unique-fields/blueprint/things/handle/thing.ts:9 (G4's spelling)
  unique: { name: { while: ["claimed"] } },

// e2e/fixtures/m1/unique-fields/src/handle/claim.ts:12-13 (every handler, by hand)
    const held = yield* steps.look(records.findBy(Handle, "name", name));
    if (held) return yield* new HandleTaken({});
```

1. **Names as strings.** `"name"` and `"claimed"` are declared names written as strings outside `generated/`, against
   `AGENTS.md`. A renamed state compiles and silently unscopes the rule until the compiler's check runs.
2. **The refusal is still the handler's.** The store backs the rule, but the answer the caller gets (`HandleTaken`) is
   written in every handler that can break it, and nothing ties the error to the rule. The scaffold writes a
   "refuse HandleTaken when?" blank for the builder to fill (`examples/plugged-in/src/handle/claim.ts:48` at
   `a2d29b10`; the climb has since filled it with a `findBy` check).
3. **No home for the others.** Plugged In already has three rules across records, each hand-coded in a handler:
   `HandleTaken` (one holder per name), `HandleAlreadyOwned` (one claimed name per person,
   `examples/plugged-in/src/handle/claim.ts:54`) and `LinkNeedsHandle` (a link needs a claimed name,
   `src/link/add.ts:48`). G4's map, keyed by field, can't hold two rules on one field or one rule over two fields.

**The sweep.** Every blueprint we have (acme, Plugged In, signup, starter, work, the fixtures, and the unmerged
tickets example at `claude/docs-canon-cf2c38` `5c84827`) was read for refusals decided by other records. The families,
with their real instances:

| Family | Instances | Earns a kind? |
|---|---|---|
| within one record, by state | `LinkAlreadyRemoved` (a self-move would cover it) | no: machines |
| unique across records of one thing | `HandleTaken`, `HandleAlreadyOwned`, `PersonEmailTaken` (Better Auth's), work's `RunTaskClaimed` (composite: mission and task) | **yes, now** |
| across things | `LinkNeedsHandle`; work's `MissionNotRunning` ×2, `MissionNotInIntake`, `MissionClosed`, `MissionHasOpenQuestions` | yes, later (`requires`) |
| a running total under a bound on the same record | `SheetFull` (signup), `AllowanceExceeded` (acme), `SoldOut` (tickets) | yes, later (a bound) |
| a count ("at most N links") | none anywhere | no |
| a case-normalised key | none enforced; `HandleName` refuses capitals (`blueprint/values/page.ts:3`) | no: it belongs to the value |

Unique is the only family Stage 1 needs, and the only one whose semantics (G4) are already built and checked.

## The call

### 1. The spelling

Each thing may have `blueprint/things/<thing>/invariants.ts`, beside `machine.ts`, `roles.ts` and `errors.ts`. One
named export per rule; the export's identifier is the rule's name, and its full name is `<thing>.<export>`
(`handle.oneHolderPerName`), as errors and roles are named.

```ts
// blueprint/things/handle/invariants.ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { machine } from "./machine.ts";
import { HandleAlreadyOwned, HandleTaken } from "./errors.ts";

// A name has one holder while it is claimed. A released handle keeps its name and frees it.
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed],
  refuse: HandleTaken,
});

// A person holds one claimed name at a time.
export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
  while: [machine.states.claimed],
  refuse: HandleAlreadyOwned,
  description: "you already hold a name", // the generated sentence reads poorly here
});
```

```ts
// blueprint/things/profile/invariants.ts
import { Blueprint } from "orthograph";
import { Profile } from "./thing.ts";

// A handle has one page. No caller can break it (only `handle.claim` makes a profile), so it names no refusal:
// a break is the app's own bug, and `profile.get` can find the page by its handle.
export const onePagePerHandle = Blueprint.invariant.unique(Profile.fields.handle);
```

- **The key** is one field, or a non-empty tuple of fields for a composite key
  (`Blueprint.invariant.unique([Run.fields.mission, Run.fields.task], …)`). A tuple costs nothing more: D1 builds the
  same partial index over two columns, and work's `RunTaskClaimed` needs it.
- **`while`** lists states of the thing's own machine. Left out, the rule holds in every state (and a thing with no
  machine can only leave it out).
- **`refuse`** is an error declared in the same thing's `errors.ts`. It is optional: a rule no caller can break (a
  record only the app's own steps make, like a handle's page) names none, and a break is a defect naming the rule.
  Such a rule still gets its index and its `findBy`, which is what Plugged In's `profile.get` needs (snag S-23).
- **`description`** is optional words for the reader. Left out, every surface says a sentence generated from the rule
  ("another claimed handle holds this name"); written, it replaces that sentence everywhere. The owner rule needs it:
  generated, it reads "another claimed handle has this owner", so Plugged In writes "you already hold a name" (Aaron's
  go-ahead on the grill, 20 November 2026, Q2).
- **Typed references, no strings.** `Handle.fields.name` already exists. `machine.states.claimed` is new: a machine's
  `states` becomes a record of state references, the way `machine.moves.claim` is already a record of move references
  (`examples/plugged-in/blueprint/things/handle/verbs/claim.ts:10`). The declaring site keeps its array,
  `states: ["claimed", "released"]`, because that is where the names are declared; a blank `states`
  (`Blueprint.todo`) gives an empty record, and the compiler reports the blank as it does today. The readers of the
  declaration's array change with it (`compiler/.../describe.ts:89,92`, `prove/.../journeys/internal/checks.ts:29`,
  `orthograph/.../machines/service.ts:8`); everything downstream reads the model's array, which stays.
- **Why a namespace, `Blueprint.invariant.unique`:** the file holds one kind of declaration with several forms, and
  the forms to come (`requires`, a bound) sit beside `unique` without new top-level names. The compiler sorts the
  file's exports by `kind: "invariant"`, as it does errors and roles (`compiler/.../model/internal/layout.ts:136-164`).

### 2. The file's name

`invariants.ts`, plural, like `errors.ts` and `roles.ts`, because it holds many named exports (only `thing.ts` and
`machine.ts` hold one). The compiler's layout reader takes it as a new branch; any other file name in a thing's folder
stays refused (`layout.ts:163`). `ortho add thing` writes an empty one with a one-line comment, as it writes
`errors.ts` (`cli/.../add/internal/templates.ts:51-55`). A cross-thing rule, when it comes, lives in the folder of the
thing whose records it constrains (`needsAClaimedName` in `link/invariants.ts`).

### 3. How a refusal is linked

The rule owns its refusal, once. (A rule with no `refuse` attaches nothing: a break is a defect, as in 5.)

- **One owner.** An error is refused by at most one invariant, and an invariant's error may not also be listed in a
  verb's `errors:`. The compiler refuses both, naming the invariant: "HandleTaken is refused by the runtime for
  `handle.oneHolderPerName`; take it out of `errors` in `blueprint/things/handle/verbs/claim.ts`." So the handler's
  type (`ErrorOf<O>`, `orthograph/.../operations/types.ts:140`) never includes it, and a handler cannot construct it.
- **Attached to every operation that can break the rule.** The compiler computes the breakers and adds the refusal to
  each one's `refusals`, with a map back to the rule. An operation breaks a rule of thing T when:
  1. its move on T can end in a `while` state (any move, for a rule with no `while`); or
  2. one of its database steps names T in `writes` explicitly; or
  3. T has no machine, and the operation is on T and has a database step (there is nothing finer to go on).

  A move that ends only outside `while` cannot put its record in scope, and a step that writes only by default (the
  operation's own record, `orthograph/.../operations/types.ts:15-16`) is accounted for by the move. On Plugged In that
  makes `handle.claim` a breaker and not `handle.release` (it only leaves `claimed`) or `handle.resolve` (no move, a
  default step). The model can't see which fields a step changes, so an operation with no move that rewrites a key on
  a record in scope is missed; the runtime then dies naming the rule and the operation (5), so the blind spot is
  loud, and the author's fix is `writes: [Handle]` on that step, until field-level `writes` (7) make breakers exact.
  Rule 3 is coarse on purpose (_Superseded by S31, 21 November 2026 amendment: it applies only to a database step that leaves `writes` unset, and `writes: []` means reads only, so `profile.get` declares it and breaks nothing_): it makes `profile.get` (a read) a breaker of `onePagePerHandle`, and misses
  `handle.claim`, which makes a profile without `writes: [Profile]`. Both are accepted for a rule with no `refuse` (_Superseded by S31, 21 November 2026: `handle.claim` names its `writes: [Profile]`, and the model carries each operation's `breaks`_),
  where a breaker attaches no refusal and the runtime's check dies on a break whichever operation made it.

  ```jsonc
  // generated/model/model.json (the model may carry strings: it is generated)
  "things": { "handle": { "invariants": {
    "oneHolderPerName": { "kind": "unique", "fields": ["name"],  "while": ["claimed"], "refuse": "HandleTaken" },
    "oneNamePerPerson": { "kind": "unique", "fields": ["owner"], "while": ["claimed"], "refuse": "HandleAlreadyOwned",
                          "description": "you already hold a name" } } } },
  "operations": { "handle.claim": {
    "errors": [],
    "invariants": { "HandleTaken": "handle.oneHolderPerName", "HandleAlreadyOwned": "handle.oneNamePerPerson" },
    "refusals": ["HandleTaken", "HandleAlreadyOwned", "NotAllowed"] } }
  ```

  The SDK's error union, the CLI's exits and MCP's error codes already read `op.refusals` or the project's refusal
  table (`projections/.../api/internal/api.ts:97`, `render/internal/cli.ts:51-52`,
  `language-effect/.../mcp/internal/tool.ts:30-43`), so they need no change. The exit-clash check reads the new
  refusals too (`compiler/.../exits.ts:76` reads only `errors` and `notFrom` today).
- **What the refusal carries.** Every field of the `refuse` error must be one of the rule's key fields, by place, and
  the runtime fills it from the caller's own row, never from the holder's (that would say who holds the name).
  `HandleTaken {}` passes; `HandleTaken { owner }` is refused at compile time.

### 4. The handler doesn't refuse; `findBy` stays for reads

The runtime refuses alone. A handler that needs to *read* by a unique key still can, with the rule as the key:

```ts
// before (G4)
const held = yield* steps.look(records.findBy(Handle, "name", name));
// after (G5): the scope comes from the rule, so nothing is a string
const held = yield* steps.look(records.findBy(oneHolderPerName, name));
```

It returns the one holder within the rule's scope or `undefined`, sees this call's own writes first (as G4's does,
`language-effect/.../records/internal/unit.ts:34-50`), and takes the key's value (an object of the fields for a
composite key). Plugged In needs it for reads, not refusals: `handle.resolve` (name to id, through
`oneHolderPerName`) and `profile.get` (name to handle, then handle to page, through `onePagePerHandle`).

### 5. Where the runtime holds the rule

The rule is one more stop on the spine every server operation runs (`language-effect/.../handler/service.ts`):

| Stop | Today | What it guards |
|---|---|---|
| role check | `:77` | who may call (roles) |
| replay | `:85-92` | the same request twice |
| not found | `:94` | the subject exists |
| from-check | `:95` | the move starts in a state the machine allows (machines) |
| handler | `:98` | the declared errors only the handler can know |
| answer check | `:102-105` | the answer's shape |
| move | `:107` | the state the machine moves to |
| **invariants** | **new, between `:107` and `:111`** | **every rule the call's writes could break** |
| commit | `:111-120` | the store's own index: a race becomes a conflict, and the call retries |

- **Before commit**, after the move (the move is what puts a handle into `claimed`), the runtime looks at each row
  as this call leaves it. For each rule the row is in scope for, it looks for another holder of the same key and, if
  there is one, refuses with the rule's error, filled as in 3. This is G4's handler check, moved into the runtime.
- **At commit**, nothing changes from G4: D1's partial unique index refuses the second of two racing commits, the store
  maps that to a conflict (`host-cloudflare/.../store/internal/commit.ts:39`), the call retries, and the retry's
  check sees the winner and refuses. The index is built from the model's invariants and named after the rule
  (`"<table>_<rule>"`), so two rules on one field with different `while` sets get two indexes.
- **A rule the operation doesn't list** (the blind spot in 3) is a defect naming the rule and the operation, never
  an undeclared refusal on the wire.
- **The refusal is counted as a refusal**, never a defect: the runtime's refusal set (`service.ts:53-58`, built from
  `op.errors` today) takes the operation's invariant refusals from the generated serve spec, as it takes `notFrom` and
  `notFound`. The operation span carries `refusal.invariant: "handle.oneHolderPerName"` beside `refusal` and
  `refusal.code` (`service.ts:129-132`), and the runtime writes the deciding log line itself, so eval 9 and the
  portal's "why" still have one.
- **Not on actors, not on the device.** A thing that lives as actors is refused, with the real reason: each instance is
  its own Durable Object, a commit writes one instance, and there is no shared index or list to look in
  (`host-cloudflare/.../store/internal/actors.ts:19-23`, `store/service.ts:38-39`). G4's message ("nothing to be
  unique among") is wrong and is replaced. An operation that `runs: "client"` and breaks a rule is refused: the device
  runtime has no store (`handler/internal/device.ts:42-48`).

### 6. S-19 / HAN-18: one call moving a value between holders

(Snag S-19 is in `design/goals/03-snags.md` at `67575774`; ledger row `HAN-18` is on `origin/goal-3/han-10-check`,
`design/ledger.md:794`, Codex's P2 on #118. Neither has reached `goal/stage-1` yet.)

A call that moves a value (A `x`→`y`, then B `y`→`z`) passes the memory store, which checks only final values
(`records/internal/unique.ts:23-35`), and fails on D1, which checks each statement in order and has no deferred unique
check. The handler then retries the same doomed batch 64 times and dies as a "version race". The call:

1. **The unit orders its writes:** a row that frees a key (leaves the scope, or changes the key) is written before a
   row that takes one. A cycle has no order and the call dies as a defect naming the rule: a straight swap, or two
   rules whose frees and takes cross (row A frees a key of rule 1 while taking one of rule 2, and row B the reverse).
   Both stores die on it alike.
2. **A clash among the call's own rows is a defect, never a retry.** The before-commit check sees it first and dies
   naming the rule; it is the handler's bug, not a race.
3. **The memory store applies writes one at a time,** in the unit's order, and checks after each, so the two stores
   agree on every call.

After this, every unique conflict at commit is another call's, and retrying is right.

### 7. What ships now, and what's later

| Now (Stage 1) | Later, each with its own decision step |
|---|---|
| `Blueprint.invariant.unique`, one field or a tuple, `while` and `refuse` optional | **`requires`**: across things (`LinkNeedsHandle`, work's four `Mission*`). Open: a key from the caller rather than a field (`link.add` carries no owner), and whether it holds only when a record is made or always, in which case `handle.release` breaks it and must refuse or cascade (`journeys/release-a-handle.ts:60-78`) |
| `machine.states.<state>` references | **a bound on one record** (`taken + people ≤ places`): `SheetFull`, `AllowanceExceeded`, `SoldOut`. Open: these refusals carry a computed `left` |
| `records.findBy(rule, value)` | an early refusal before the handler, for a creating move whose payload carries the key, so side-effecting steps don't run first |
| the HAN-18 write order | field-level `writes` on database steps, so breakers are exact rather than conservative |
| | `ortho add invariant handle.oneHolderPerName` |
| | caseless keys: in the value (K9's `names.lowercase` choice), never as a key function, which no index can hold |

Each later form gets its row in `later.md` now and a decision step before the slice that first needs it.

### 8. How it sits beside machines and roles

| File | Says | Holds across | Refused by | When |
|---|---|---|---|---|
| `roles.ts` | who may call | the caller and one record | `NotAllowed` | before the handler |
| `machine.ts` | how one record lives | one record's states | the machine's `notFrom` | before the handler |
| `errors.ts` + the handler | what only the handler can know | anything the handler reads | a declared error | in the handler |
| `invariants.ts` | what stays true among many records | records of one thing (later: of two) | the rule's own error | after the move, and again at commit |

Each is one file per thing, each is enforced by the runtime in a fixed place on the spine, and each reaches the outputs
through the model. A refusal now comes from one of four places, not three (`docs/canon/operations.mdx:119`).

## What follows

### The ripple map

| Area | What changes | Slice | Order |
|---|---|---|---|
| The grid | a fourteenth block, `invariant`, with its nine cells (today: model `~`, api `✗`, server `~`, sdk `~`, cli `~`, mcp `✗`, docs `~`, portal `✗`, telemetry `✗`); 117 cells become 126 in `grid/types.ts:20,52`, `grid.json:7` and K14 (`:34,118,529`); K14's "Rows still to come" (`:683-689`) gains it | ST1.10 | 1 ∥ |
| Stores | the unit orders its writes; the memory store checks write by write; a self-made clash dies naming the rule (HAN-18) | ST1.11 checks, ST1.12 build | 1 ∥ |
| Checks | check 25 rewritten to `invariants.ts` (only a checks author may: its refusal cases edit `thing.ts` text, `e2e/m1/25-unique-fields.test.ts:97-108`); new cases for every refusal in 1 to 5; a fixture journey that reaches both refusals; G4's five package tests rewritten onto the new spelling (`compiler/.../model/unique.test.ts`, `host-cloudflare/.../store/unique.test.ts`, `language-effect/.../records/find-by.test.ts`, `records/unique-structured.test.ts`, `handler/internal/decided-find-by.test.ts`) | ST1.13 | 1 ∥ |
| `Blueprint` | `machine.states` as references; fields keep their key and thing in their type; `Blueprint.invariant.unique` with optional `while`, `refuse` and `description`; `findBy(rule, value)`'s type | ST1.14 | 2 |
| Compiler and model | layout reads `invariants.ts`; `things.<t>.invariants`, `description` included, with its hash; every check in 1 and 3; breakers; `operations.<op>.invariants` and the merged `refusals`; the exit-clash scan; actors and client operations | ST1.15 | 3 |
| Runtime and stores | the invariants stop; the refusal set; the filled refusal; `refusal.invariant` and the deciding log; a missed breaker dies naming the rule; indexes named per rule from the model; `lostUnique` from the model; `findBy(rule, value)` | ST1.16 | 4 |
| Outputs | docs: an `## Invariants` section and a "why" cell for each refusal, the rule's `description` or a generated sentence (`render/internal/docs.ts:20-24,70`); MCP: the same sentence in the tool's description; the scaffold: the blank gone, the header says the runtime refuses it, by which rule (`projections/.../handlers/internal/words.ts:84-89`, `body.ts:21`, `header.ts:90-103`); `ortho add thing` writes `invariants.ts`; the portal's wire carries `invariants` on things and operations, and their hashes (`portal/.../wire/types.ts:27-67`) | ST1.17 | 4 ∥ |
| Prove | coverage asks for each rule's refusal once, from any journey on any breaker, not once per operation; eval 9 takes the runtime's deciding log; prove's world holds the rules (today `findBy` dies there, `prove/.../journeys/internal/world.ts:112`) | ST1.18 | 5 |
| Plugged In | `handle/invariants.ts` (`oneHolderPerName`, `oneNamePerPerson` with its `description`) and `profile/invariants.ts` (`onePagePerHandle`), replacing the three one-line `unique:` entries; `HandleTaken` and `HandleAlreadyOwned` leave `claim`'s `errors:` and its handler | ST1.19 | 6 |
| G4's spelling retired | `unique` leaves `Blueprint.thing`, the compiler's `unique.ts`, the model's `unique` view and `Records`' `T["unique"]` typing | ST1.20 | 7 |
| The canon | a new `invariants` page in layer 2 beside `machines`, owning the words invariant and unique; `blueprint.mdx`'s file list and placement table; "four places a refusal comes from" in `operations.mdx` and `machines.mdx`; `stores.mdx` and `data.mdx` re-quoted; the glossary; `docs/canon/check.mjs:35` accepts `ST` ids in `planned=` fences | ST1.21 | 8 |
| The portal's pages | a Rules section under the lifecycle, each refusal's sentence linking to its rule, a "rules" stop on the spine (the grill, answered 20 November) | ST1.22 | after M1.13 |

The slices are rows ST1.09 to ST1.22 of Stage 1 in [`../milestones.md`](../milestones.md).

### What Plugged In needs, and when

**No G5 slice blocks the climb, but only because Plugged In carries three of G4's one-liners until ST1.19.** A
handler finds records only by id or by a unique field, so every rule a handler must check or look up through has to be
declared unique somewhere, and G4's spelling is the one that exists today. The first climb proved it: "claim a handle"
stopped at 5 of 8 because `HandleAlreadyOwned` can't be hand-written while `Handle.owner` isn't unique (snag S-22), and
`profile.get` can't find a page by its handle (S-23). So Plugged In declares, in Plugged In only (the Goal 3 lead's
#139):

```ts
// examples/plugged-in/blueprint/things/handle/thing.ts
  unique: { name: { while: ["claimed"] }, owner: { while: ["claimed"] } },
// examples/plugged-in/blueprint/things/profile/thing.ts
  unique: { handle: {} },
```

The handler still refuses `HandleTaken` and `HandleAlreadyOwned` itself, through G4's `findBy`, until ST1.19 swaps all
three for the `invariants.ts` files in 1 once ST1.16 to ST1.18 have landed. Only then does ST1.20 retire G4's spelling.
The spelling spreads nowhere else meanwhile.

### Who does what

A checks author writes ST1.11 and ST1.13 (builders never edit checks); a builder each of ST1.12, ST1.14 to ST1.18 and
ST1.20; Plugged In's journey author and climber ST1.19, in their own lanes (the blueprint and the handlers); the canon
thread ST1.21, which owns `docs/canon/check.mjs`; the portal designer ST1.22 after the grill, once a checks author has written its Chromium check.

## Supersedes

ST1.20 (21 November 2026) retired G4's spelling in the live docs.

- design/frame/writing-a-feature.md: "unique: [["address", "chain"]], // one account per address on a chain (spike finding 5)" → "`wallet/invariants.ts` declares `Blueprint.invariant.unique([Wallet.fields.address, Wallet.fields.chain])`"
