# K16: the scaffold explains itself

Decided 19 November 2026 by the ✍️ author for the conductor, from Aaron's call that day. After the blueprint →
generated → scaffolded walkthrough he asked for the scaffold to say, verbosely and visually, what it is and what it was
made from. His words: "what the machine could give you, yes, we need to do that… That's on the critical path. This is
what we need to do now", and "I agree with points four and five… I just want the DX to be better around it." Point 4:
the scaffold reads the machine. Point 5: a machine is finite, so every path through it, allowed and refused, gets a
journey stub. Later that day he added: "can't we use other effects things like match and stuff like that to make it
easy to read?", called the header "front matter" and was happy with it verbose, and asked "what is the full scope of
preloading and pre-handling… as long as this can all… fall out mechanically" (the last section answers it). He
reviewed that list and wrote "make sure this is handled": the seven items he asked for (the subject and what the payload
names handed in, a generated not-found refusal, a minted id, events the types and compiler guarantee, one exit table for
every surface, journey stubs per error and role, visibility in the header) are in M1, slices M1.44 to M1.48, not M2.

## What changes for someone using Orthograph

When you open a new handler, the top of the file now tells you everything about it in plain lines: who may call it, what
comes in and goes out, every way it can be refused, the whole lifecycle of the thing with your call's rows marked, and
what Orthograph already does so you don't. The body is laid out for you: each step in order, each refusal with a blank
for each field it carries, one branch for each place the move can end (written with Effect's `Match`, so when the
lifecycle gains an ending your handler stops compiling until it handles it), and a note where the answer has to
supply something the event needs. And one command, `ortho add journeys <thing>`, writes a journey stub for every path through
the thing's lifecycle, for every role that may or may not call, and for every refusal you declared; and `ortho check`
tells you when the blueprint grows past a handler you already wrote.

Your handler also gets more handed to it. The thing it's about arrives already read, and so does anything the payload
names by id. A call that creates gets its new id. If an id names nothing, Orthograph refuses before your code runs, with
a not-found refusal it made for you. Every refusal's exit code, code and HTTP status come from one table, so the
command line, the HTTP API and an agent over MCP all say the same thing. And if an event needs a field that nothing in
the call can supply, the compiler tells you when you write the blueprint, not when someone calls it.

## Where things stand today (`origin/m1` at `6419d4b7`)

- **The scaffold says almost nothing.** `renderHandlerScaffold` takes only the operation
  (`packages/projections/src/modules/handlers/internal/scaffold.ts:59`). Its doc comment is the description alone
  (`scaffold.ts:78`). Each step is a bare blank (`scaffold.ts:81`). Each refusal takes one blank for all its fields
  (`scaffold.ts:85`). The move is one blank for "the move's outcome" whatever the outcomes are (`scaffold.ts:64-66`),
  and the answer is one blank (`scaffold.ts:89`). It cannot say more: the thing's machine, errors, events and role
  rules are on `ThingModel` (`packages/compiler/src/modules/model/types.ts:36-55`), not on the operation.
- **The runtime already does a lot the handler never sees.** It checks who may call before the handler's span opens
  (`packages/language-effect/src/modules/handler/service.ts:60`). Then the machine's check
  (`service.ts:71`; `move.ts:30-40`, which skips a move with no `from`, `move.ts:33`). It runs the handler as counted
  work (`service.ts:74`). It checks the outcome the handler chose against the move's `to` (`move.ts:43-53`). It sets
  the state and builds the event from the instance as the call left it, then the payload, then the answer, the later
  winning (`move.ts:56-75`, the order at `move.ts:63-64`). It commits in its own span (`service.ts:88`) inside the
  operation's span (`service.ts:102`). The handler is told none of this beyond the `move` comment in its type
  (`packages/language-effect/src/modules/handler/types.ts:23-33`).
- **The words already exist, three times.** The docs page says who may call, each refusal with its exit code and
  meaning, and the machine as a table (`packages/generators/src/modules/render/internal/docs.ts:14-27`, `:66-68`).
  `ortho brief` says which refusals the runtime gives instead (`packages/cli/src/modules/brief/service.ts:32-34`).
  The scaffold says none of it.
- **`ortho check` lists only `Blueprint.todo` in `blueprint/`, never `Handlers.blank` in `src/`.** It reads
  `textsUnder(root, "blueprint")` (`packages/cli/src/modules/check/service.ts:21`) and matches `Blueprint.todo`
  (`packages/cli/src/modules/check/internal/blanks.ts:3`). A fresh scaffold's blanks are found only when `prove` reaches
  one (`BlankReached`, `types.ts:53`). That stays: a `Handlers.blank` is a hole in your code, which `prove` names
  with the step that reached it; a `Blueprint.todo` is a hole in the declaration, which `check` names.
- **Drift is half caught.** A new required step is already a warning, "required step steps.<key> is never called"
  (`packages/lint/src/modules/rules/internal/steps.ts:35`, wired as a warning at
  `packages/cli/src/modules/check/internal/tools.ts:49`). A new outcome or a new declared error is caught by nothing:
  check 19 shows `check ✔` with no warning for both.
- **The model carries files, not lines.** An operation has `file` (`types.ts:81`); a thing has none, but its files
  are fixed by the layout (`blueprint/things/<thing>/{thing,machine,errors,events,roles}.ts`) and found by
  `thingFileAt` (`packages/projections/src/modules/names/internal/names.ts:33`). No declaration has a line number.

## a. The header

Every handler scaffold's doc block, on the handler itself so an editor shows it on hover, says, in this order, each
part with the file it came from:

1. `<operation>: <description>` (the operation's `description`).
2. **Who may call**, from the roles file: the docs page's own phrase (`docs.ts:14`), then the role's rule as the
   model holds it (`roleRules`, `types.ts:52`). `anyone` and `signed-in` cite the verb file.
3. **Payload** and **Answer**, from the verb file: one line per field, `name  label`, where the label is
   `ref ?? named ?? value.type`, then its visibility: `(private: only <who> sees it)`, `<who>` in item 2's words for
   the roles it names, or `(secret: no caller sees it)`; a public field has none. The same words go on the docs page
   (`docs.ts:12` today marks visibility its own way; it moves to these). When a field
   gains a description (M1.42, K14's finding that `FieldModel` has none, `types.ts:18-26`), it follows the label. An
   empty payload is `Payload: none.`, an empty answer `Answer: nothing.`
4. **Refusals**, in `op.refusals` order (declared, then the machine's, then `NotAllowed`): name, `exit`, code, and who
   gives it. A declared one is "yours to refuse below", with its fields; the machine's is "the runtime's, when the
   <thing> isn't in <from>", carrying `state`; `NotAllowed` is "the runtime's, when the caller isn't <who>". A `<Thing>NotFound` (M1.46, g) is "the
   runtime's, when no <thing> has that id, carrying id", listed for each referenced id or subject no role check reads. Each
   cites its file (errors, machine, roles).
5. **Idempotent by request** and **Budget**, each only when the verb declares it.
6. **The thing's machine**, whenever the thing has one: a table of `from | move | to | emits`, one row per
   (from, to) pair in declared order, `(creates)` for a move with no `from`, and `▶` before this call's rows. When
   the operation makes no move, the caption says so and no row is marked.
7. **What the runtime does, so this handler doesn't**, each line present only when it applies: the role check
   (when anyone but `anyone` may call, `service.ts:40`); the machine's check (when the move has a `from`,
   `move.ts:33`); each step's span (`service.ts:48`); setting the state to the outcome given to `move`; writing the
   event, and from where each field comes (answer, else payload, else the instance as the call left it, as
   `move.ts:63-64` merges them); what it hands in (M1.46, g): the subject it read, each thing the payload
   references as `refs.<field>`, and the id it mints for a creating move; the operation's span and its commit's (`service.ts:88`, `:102`).

**The rule:** every word in the scaffold is a name or a description from the model, or one of the generator's fixed
phrases about Orthograph itself. Nothing names the domain unless the blueprint does: no "money left", no "the
member's balance". The header's sentences come from the same functions as the docs page and `ortho brief`, moved
into `@orthograph/projections` so the three can never disagree. Columns are padded to the longest entry plus two
spaces.

## b. The body

In this order, top to bottom:

1. **Each step, in declared order**: `// Step <key>: <kind>, span <span name>.` then `yield* steps.<key>(Handlers.blank("<key>: the work this step does"));`, with `// optional: may be skipped` when it is. A database step's comment
   also names its store when the model has one to name (the thing's `store`, `types.ts:46`, or the step's `writes`,
   `:68`); with neither, as in acme, it says nothing more.
2. **Each declared error**, at the place section c gives: `// <Error>: exit <n>, <code>.`, the `if` on a blank,
   the `Effect.logInfo` that eval 9 wants, then `new <Error>({ ... })` with **one blank per field**, each saying the
   field and its label (`"AllowanceExceeded.remaining, an Amount"`). An error with no fields is `new <Error>({})`.
   The machine's refusal and `NotAllowed` get no block: the runtime gives them.
3. **The move**: with one outcome, `// The move <key>, from <from>, to <to>.` and `yield* move();`. With more, the
   outcome is a value and each ending is a `Match.when`, in declared `to` order, closed by `Match.exhaustive`:
   ```ts
   const outcome = yield* Handlers.blank<Outcome>("where spend ends: active or exhausted");
   yield* Match.value(outcome).pipe(
     // To active. From there the allowance can: spend (to active or exhausted), revoke (to revoked).
     Match.when("active", () => move("active")),
     // To exhausted. From there the allowance can: revoke (to revoked).
     Match.when("exhausted", () => move("exhausted")),
     Match.exhaustive,
   );
   ```
   Each branch's comment lists every move whose `from` holds that state, or `nothing more` when none does. `Outcome`
   is the move's `to` as a literal union, exported by the generated handler type (`<verb>.handler.ts`) beside
   `Handler`. `Match.value`, `Match.when` and `Match.exhaustive` are exported by the `effect` pinned on `m1` (4.1.1,
   read from its exports); a probe in acme compiled the full union and failed at `Match.exhaustive` with one more
   member. An `if`/`else` chain was the first draft: it reads worse and a new outcome silently falls into the `else`.
4. **The answer**: an object with one blank per answer field. Above a field, a comment wherever the event needs it
   and only the answer can give it: an event field that is in neither the thing's fields nor the payload. For spend
   that is `remaining` (`AllowanceSpent` has `allowance, amount, memo, remaining`; the payload has the first three;
   the thing has none of them by those names). An empty answer is `return {};`.

An operation that calls an adapter (`calling`, `scaffold.ts:25-56`) keeps its call wiring and gains the same header.

**The signature** becomes `renderHandlerScaffold(op, path, model)`: the model is required, because the header needs
the thing. Its two callers pass it (`packages/generators/src/modules/render/service.ts:28`,
`packages/projections/src/modules/server/internal/server.ts:225`).

**The outcome must be a literal union, and today it isn't.** The machine keeps its literals (`machine.moves.spend.to`
is `readonly ("active" | "exhausted")[]`, `packages/orthograph/src/modules/machines/types.ts:14`, `:37`), but
`Operation` types its move as `Move | undefined` (`packages/orthograph/src/modules/operations/types.ts:78`), so the
handler's `MoveTo<O>` (`packages/language-effect/src/modules/handler/types.ts:33`) is `string` for spend: a probe
assigning `"frozen"` to it compiled. M1.44 gives `Operation` a type parameter for its move, inferred by
`Blueprint.operation` (`operations/types.ts:142-148`), so `MoveTo` is `"active" | "exhausted"`, `move("frozen")` stops
compiling, and the generated handler type exports it as `Outcome`.

**Other `Effect` idioms, weighed.** Refusals are already typed errors: `new AllowanceExceeded(...)` from
`Errors.declared`, and the handler's error channel is `ErrorOf<O>` (`types.ts:36`), so an undeclared one won't
compile. `Effect.catchTags` has no place in a handler, which raises refusals and never catches them (the runtime does,
`service.ts:93-100`); its place is an adapter call's failure mapping, which the calling scaffold leaves as one blank
(`scaffold.ts:28`): `Match.tags` over the callable's failure union, when callables declare one, is later and new. The
answer is already a typed object (`AnswerOf<O>`), so a missing `remaining` won't compile.

## c. Where refusals sit relative to steps

The model doesn't say which steps read and which write, except a database step that names `writes`
(`types.ts:67-68`). The rule: **the refusal blocks go before the first step that names `writes`; when none does,
before the last step; with no steps, before the move.**

| Option | allowance.spend (load, record) | allowance.grant (insert) | Fits the journeys? |
|---|---|---|---|
| **A · before the first writing step, else the last** (chosen) | after `load`, before `record` | before `insert` | ✅ `spend-within-allowance.ts:26` wants `record` absent and `load` present on a refusal; acme's grant journey wants `insert` absent |
| B · before every step | before `load` | before `insert` | ⚠️ spend can't know what's left before it loads |
| C · after every step | after `record` | after `insert` | ❌ the write's span runs on a refusal, which acme's journeys refuse |

Why: the last step is the likeliest write, because what decides a refusal has to be read first; and a refusal must
leave the write's span absent, which is what acme's journeys check. Nothing commits either way (the unit commits only
after an answer, `service.ts:86`), so this is about spans and readability, never correctness. It is a starting place
in a file that is yours; moving the block is a cut and paste.

## d. Source locations

The model carries no line numbers, and K16 adds none: **the header cites files only.** A scaffold is written once and
never regenerated, so a line number in it is wrong the first time the blueprint is edited; a file stays right,
because names come from paths and a declaration's path is its identity. Adding locations would touch the compiler's
loader for every declaration to serve one comment. If the portal later wants "jump to line", that is the model's own
slice, not this one.

| Axis | A · files only (chosen) | B · the model gains locations |
|---|---|---|
| Floor-first | ✅ ships with M1.44 | ⚠️ needs a compiler slice first |
| Reversibility | ✅ adding lines later is additive | ✅ |
| Blast radius | ✅ the scaffold alone | ❌ every declaration's loader and the model hash |
| Correctness | ✅ a file never goes stale | ❌ a line is stale after one edit |
| Fit | ✅ `op.file`, `thingFileAt` exist | ⚠️ nothing reads lines today |

## e. Journey stubs (point 5)

**The paths.** For each thing with a machine, for each move in declared order, for each operation that makes it (by
name): first every allowed path, one per `from` (or `(creates)`) and `to`, in declared order; then every refused path,
one per state not in the move's `from`, in declared state order, refused with the machine's `notFrom`. A move with no
`from` creates, and the runtime never checks it (`move.ts:33`), so it has no refused path. Declared errors and
`NotAllowed` are not machine paths; they get stubs of their own, after the machine's (below). `machinePaths(model,
thing)` returns the machine's list; allowance has eight: five allowed, three refused (golden list in `handlers.test.ts`).

**Per role and per declared error** (what was M2.17, folded into M1.45 because only the scaffold changes). After the
machine's paths, for each of the thing's operations and reads in name order:

- **allowed**, one stub per `allowed` entry that no machine stub already casts (a machine stub casts the operation's
  first entry): `<thing>-<verb>-allowed-<role>`, cast as that role, the call answering;
- **refused**, one stub when anyone is turned away: for a role gate, `<thing>-<verb>-refused-not-<role>[-or-<role>…]`,
  cast `stranger: Blueprint.signedIn`; for signed-in only, `<thing>-<verb>-refused-anonymous`, cast with no one; for
  `anyone`, none. It `refuses(Blueprint.NotAllowed)` and `noEvents()`, and opens `Scaffolded from` the roles file;
- **each declared error**, in declared order: `<thing>-<verb>-refused-<error in kebab case>`, cast as the first
  allowed role, `refuses(<Error>, Blueprint.todo("<Error>'s fields: …"))` and `noEvents()`, opening `Scaffolded from`
  the errors file.

The runtime's own `<Thing>NotFound` gets no stub: it is the runtime's, proved once in `prehandle.test.ts`. Allowance
gets sixteen in all: the eight paths, then `get` allowed as grantee and as owner and refused to anyone else, `grant`
refused to a non-owner and on `AllowanceLimitTooHigh`, `revoke` refused to a non-owner, `spend` refused to a
non-grantee and on `AllowanceExceeded`. Five are goldens.

**Where and how they're named.** `ortho add journeys <thing>` writes one scaffold per path to
`blueprint/journeys/<thing>-<verb>-<path>.ts`, where `<path>` is `<from>-to-<to>`, `created-in-<to>` or
`refused-from-<from>`. Flat, because the compiler reads a journey only at `blueprint/journeys/<file>.ts` or
`journeys/<file>.ts` (`packages/compiler/src/modules/model/internal/layout.ts:90`), and in `blueprint/`, because
that is where `ortho add journey` writes (`packages/cli/src/modules/add/internal/templates.ts:95`) and where
`check` looks for blanks. The title is `<operation>: <path in words>` (`"allowance.spend: refused from revoked"`).

**Each machine stub** opens `// Scaffolded from blueprint/things/<thing>/machine.ts. Yours from now on.`, says which path it is
in a doc block, and has the cast (the first `allowed` role), one step calling the operation, and its checks: an allowed
path `emits(<Event>, ...)` and `machine.isIn(..., "<to>")`; a refused one `refuses(machine.notFrom, { state })`,
`noEvents()` and `machine.isIn(..., "<from>")`. The starting world, the payload, the event's fields and the
instance's id are `Blueprint.todo`, each saying what belongs there. The goldens type-check in acme today.

**Why `ortho add`, not `ortho generate`.** Generate never writes into `blueprint/`; if it wrote stubs, every
project with a machine would fail `check` on its blanks the next time it generated, acme included (checks 00 and 10's
controls run `check` on acme), and a stub a person deleted on purpose would come back. `add` already writes
`Blueprint.todo` that `check` names (`packages/cli/src/modules/add/README.md`). Unlike `add`'s other kinds, which
write nothing if any file is there (`packages/cli/src/modules/add/service.ts:23`), `add journeys` writes the stubs
that are missing and names the ones already there, refusing only when every one is: after the machine grows, it
writes just the new paths.

**How they're counted.** A stub's `Blueprint.todo`s are blanks under `blueprint/`, so `ortho check` names each with
file and line and fails until it is filled, as it does for any blank (`check/service.ts:34`). The compiler must
accept a journey with blanks (it does today: a blank lands in the model as `{ kind: "blank" }`), list it under
`model.blanks`, and `prove` must skip it, naming it, rather than run it.

## f. Drift

When the blueprint gains a step, an outcome or an error after the handler is yours, **`ortho check` warns, naming the
handler's file**, in the rules part beside `required-step-used`:

- a required step never called: today's warning, unchanged;
- an outcome of the move that no `move("<outcome>")` in the handler names (only when the move has more than one; a
  `move(x)` with an argument that is not a literal is not judged, the way the step rule judges only named calls);
- a declared error the handler never names.

For a handler that keeps the scaffold's `Match`, **the compiler catches a new outcome first**: `Match.exhaustive`
fails to type-check until the new ending has its branch (check 19 adds `frozen` and expects `tsc` to fail in
`src/allowance/spend.ts` and nowhere else). The warning is for a handler written another way, like acme's spend,
whose `move(amount === remaining ? "exhausted" : "active")` still compiles.

A warning, not a failure, as M1.26 decided for steps: the handler may be mid-edit, and `prove`'s evals 3, 4 and 2 fail
the call that actually goes wrong. Acme as shipped names every outcome and error, so check 10's "warns about nothing"
control holds. The header is yours and may go stale; the current explanation is always `generated/docs/<thing>/<verb>.md`,
which is regenerated every time.

| Axis | A · check warns (chosen) | B · check fails | C · regenerate the header |
|---|---|---|---|
| Floor-first | ✅ the rule plumbing exists (`tools.ts:33-35`, `:49`) | ✅ | ❌ needs a merge into your file |
| Reversibility | ✅ warn → error is one word | ⚠️ | ❌ |
| Blast radius | ✅ one lint rule and its facts | ❌ every handler mid-edit fails `check`; check 10 expects a missing step to warn and pass | ❌ rewrites a file that is yours |
| Correctness | ✅ prove still fails a wrong call | ✅ | ⚠️ |
| Fit | ✅ same as the step rule | ⚠️ unlike the step rule | ❌ "Yours from now on" |

## g. What the runtime hands in, refuses and carries (M1.46 to M1.48)

**Handed in (M1.46).** A handler's context (`handler/types.ts:23-33`) gains three fields, typed from the declaration:

```ts
readonly subject: RowOf<T>;   // the instance the call is about, when its payload names the thing by id
readonly refs: { readonly [F in RefFieldsOf<P>]: RowOf<RefOf<P[F]>> };   // each thing a payload field references
readonly id: IdOf<T>;         // a creating move only: minted (`Ids.of`) before the handler runs
```

They are the reads the role check and the from-check already make (`access/service.ts:54`, `move.ts:36`), done once in
the call's unit and handed in, so `src/allowance/spend.ts:13`'s second read and `src/allowance/grant.ts:20`'s hand
minting go away. A handler that wants a fresher read still reads; the scaffold says what is handed in, and a creating
move's answer is written `allowance: id`.

**Not found (M1.46).** A missing subject or referenced thing that a role check reads stays `NotAllowed`
(`access/service.ts:54-55`): a stranger learns nothing about what exists. Anything else missing is refused before the
handler with `<Thing>NotFound { id }`. The model gives each thing that is referenced or is a subject a `<Thing>NotFound`
at `<XX>-901`, exit 4, HTTP 404 (`STATUS.notFound`, beside `NOT_ALLOWED_EXIT` in `names/internal/names.ts:51-52`),
and lists it in `op.refusals` (after the machine's, before `NotAllowed`) only on operations where it can happen. A
thing that already declares an error by that name keeps it: acme's `AllowanceNotFound` stays at AL-002, exit 43,
because "a number that has shipped does not move" (`compiler/…/model/internal/codes.ts:5`); acme's other codes, and
the tests that pin them (`model.test.ts:164`, `compare/versions.test.ts:42`), are unchanged. `Handlers.serve` gains
`notFound: { [payloadField]: tag }`, generated beside `notFrom`.

A journey names it the way it names a machine's refusal: every thing gets `notFound`, a descriptor
`{ kind: "not-found", thing }` beside `machine.notFrom`, and `Refusal` (`orthograph/…/journeys/types.ts:28`) takes
it. Prove reads its tag as `<Thing>NotFound` (as `tagOfRefusal` does for `notFrom`, `prove/…/journeys/internal/checks.ts:22`)
and counts it as a runtime refusal. Acme proves the one it gains: `grant-an-allowance` has a fourth step, ada granting
to `per_nobody`, `refuses(Person.notFound, { id: "per_nobody" })`, so prove's coverage reads `runtime refusals 14/17`
(was 13/16), not 13/17. A step, not a new journey: it is grant's refusal beside grant's others, and acme keeps eleven
journeys.

**One refusals table (M1.47).** Today the CLI reads `exits` (generated `api/src/errors.ts`; `cli/…/output.ts:13-14`),
HTTP reads each class's `httpApiStatus`, and an MCP refusal is only the text `[code] Tag { fields }`
(`mcp/internal/tool.ts:36-45`): three readings, and MCP carries neither exit nor status. M1.47 generates one table,
and every surface reads it:

```ts
export const refusals = {
  AllowanceExceeded: { code: "AL-001", exit: 41, status: 422 },
  AllowanceNotActive: { code: "AL-900", exit: 40, status: 409 },
  AllowanceNotFound: { code: "AL-002", exit: 43, status: 404 },
  PersonNotFound: { code: "PE-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  // …one row per refusal in the model
} as const;
```

`exits`, `codes` and each class's status are read from it, not written again. An MCP refusal keeps its text line and
gains `structured: { refusal, code, exit, status, …the fields the caller may see }`, so an agent tells a refusal from a
defect without parsing; `McpRefusals` gains `table`.

**An exit means one thing (M1.47).** A table is only worth having if an exit tells one refusal from another, and
nothing checks that today: no file in the compiler reads `exit` beyond copying it into the model
(`describe.ts:82`, `:89`). The journey guide found the clash live: Plugged In's `HandleTaken` is declared exit 3, which
is `NotAllowed`'s, so `links handle claim` can't tell "taken" from "not allowed" (and `portal.md` drew it). The
compiler refuses, naming the file:

- **an exit the runtime keeps.** 0 is success; 1 is any failure that isn't a refusal (a defect, the CLI's
  `NotSignedIn`); 2 is a payload that doesn't decode (`SchemaError`); 3 is `NotAllowed`; 4 is the generated
  `<Thing>NotFound` (M1.46). The generated CLI already sets 1 and 2 itself (`generators/…/render/internal/cli.ts:52`).
  `blueprint/things/handle/errors.ts: HandleTaken's exit 3 is NotAllowed's; pick another`.
- **an exit the shell keeps.** Above 125: 126 and 127 are the shell's own failures, 128 and up a signal's death, and
  an exit wraps at 256. So a declared exit is 5 to 125: `AllowanceFrozen's exit 130 is outside 5 to 125, which are
  the blueprint's; pick another`.
  **Amended by [G3](G3-runtime-exits.md) (19 November 2026):** the runtime also keeps 120 to 125 (`IdempotencyConflict`
  is 120, ledger HAN-10), so a declared exit is **5 to 119**, and the message reads `… is outside 5 to 119, which are
  the blueprint's` or, for 120 to 125, `… is IdempotencyConflict's` / `… is the runtime's; pick another`.
- **two refusals of one thing sharing an exit**, its declared errors and its machine's `notFrom` together:
  `AllowanceLimitTooHigh's exit 41 is AllowanceExceeded's; pick another`, the later one named. A declared error an
  operation borrows from another thing must also differ from every other refusal that operation lists.

**Unique per thing, not per app.** A CLI command is one operation, so an exit only has to be unambiguous among what
that operation can refuse, and those are its thing's refusals plus the runtime's (reserved) and any it borrows (checked
per operation). Per app would refuse acme as shipped, whose `AllowanceNotActive` and `InvitationNotPending` both exit
40: "the thing is in the wrong state" reads the same across things, which is useful, not a clash. And it would make a
plugin's exits collide with an app it never saw: `@orthograph/handles`' `HandleTaken` would have to avoid every
number of every app that mounts it, and a mount could break an app's build with a clash neither side can fix. Per
thing keeps a plugin's numbers its own. The table can always carry the code, which is unique per app, for a caller
who needs more than the exit.

**Events (M1.48).** The type half holds already: spend declares `remaining` in its answer, and `AnswerOf`
(`handler/types.ts:36`) won't compile an answer without it (check 19's control). The gap is an event field in none of
the thing's fields, the payload or the answer, which dies at commit today (`move.ts:65-66`) while the compiler checks
only that the event is exported (`compiler/…/describe.ts:80`). M1.48 refuses that blueprint, for each operation making
the move: `blueprint/things/allowance/events.ts: AllowanceSpent.note is in none of allowance's fields, allowance.spend's
payload or its answer, so nothing can fill it`.

## Everything the blueprint can pre-handle

**The goal: a handler holds only decisions.** When to refuse, which ending, and what to compute. Everything else falls
out of a declaration mechanically, and is either done by the runtime before or after the handler, typed so a slip
won't compile, or written into the scaffold or a stub. Aaron's bar: "as long as this can all… fall out mechanically".
Only what does is listed; each item is done today (with where), in K16's slices, or later with its slice. Checked
against `origin/m1` at `6419d4b7`; the conductor's first cut is corrected where the code says otherwise (marked ⚑).

| Declaration | What falls out | Where it stands |
|---|---|---|
| payload | decoded before anything, refused `InvalidPayload` | done: `handler/service.ts:122-124` |
| payload, answer | typed in and out; an answer missing a declared field won't compile | done: `handler/types.ts:36` (`AnswerOf`) |
| `allowed` | the role check before the handler's span opens, refused `NotAllowed` | done: `service.ts:60`, `access/service.ts:83` |
| `allowed` | the caller, typed, handed in | done: `principal`, `handler/types.ts:24` |
| machine | the from-check, refused `<Thing>Not<State>` with `state` | done: `move.ts:30-40` |
| machine | the chosen outcome checked against `to` | done at run time, `move.ts:43-53`; at compile time in M1.44 (`MoveTo` a literal union, `Match.exhaustive`) |
| machine, events | the state set and the event written once the handler answers; secret and private fields kept out of the journal | done: `move.ts:56-75`, the filter `:70` |
| `idempotent` | the same request key from the same caller answered once, changing nothing | done: `service.ts:65-70`, the key `:109` |
| steps | a span per call and per step; a blank reached dies `BlankReached` naming it | done: `service.ts:48`, `:102`, `:88`; `handler/types.ts:53` |
| call steps | wired from the payload's fields, one blank left for the failure mapping | done: `scaffold.ts:25-56` |
| errors | exit code and HTTP status per refusal, from the declaration | done for the CLI and HTTP: `api/internal/api.ts:25-40`, `STATUS` at `names/internal/names.ts:51`; one table read by the CLI, HTTP and MCP, MCP gaining exit and status, in **M1.47** |
| errors | a refusal block per declared error, one typed blank per field | M1.44 |
| everything above | the header ("front matter"): who, what, every refusal, the machine, what the runtime does | M1.44 |
| visibility | the header marks each secret or private field and who sees it; filtering stays in the runtime | **M1.44** (`(private: only <who> sees it)`, `(secret: no caller sees it)`, a.3); filtering M1.35 |
| stores | a database step's comment names the store, when the thing declares one or the step names `writes` | M1.44 (acme declares none, so its golden says nothing) |
| machine | a journey stub per path, allowed and refused | M1.45 |
| drift | a new outcome, error or step named by `check`; a new outcome won't compile under `Match` | M1.44 |
| errors, `allowed` | a journey stub per declared error (the call that triggers it, its fields as blanks) and per role (one allowed caller, one refused) | **M1.45** (e) |
| the subject | ⚑ the role check and the from-check already read it (`access/service.ts:54`, `move.ts:36`), and handlers read it again (`src/allowance/spend.ts:13`, `src/allowance/grant.ts:13` re-reads the organisation the role check loaded): hand it in as `subject`, and each thing a payload id field references | **M1.46** (g) |
| not found | ⚑ a missing subject of a role-gated call is refused `NotAllowed` today (`access/service.ts:54-55`), which keeps a stranger from learning what exists; that stays. Where no role check reads it (an `anyone` or `signed-in` call, `move.ts:37` lets it through) and for a referenced id, refuse before the handler with a generated `<Thing>NotFound`; acme declares `AllowanceNotFound` by hand (`blueprint/things/allowance/errors.ts:6`) and uses it nowhere, so it is adopted, keeping AL-002 | **M1.46** (g) |
| a creating move | the new id minted and handed in, as grant does by hand (`src/allowance/grant.ts:20`, `Ids.of`) | **M1.46** (g) |
| events | ⚑ the answer's type already forces `remaining`, because spend declares it. The real gap: an event field found in none of the thing, the payload and the answer is caught only at commit (`move.ts:65-66`); the compiler checks only that the event is exported (`compiler/…/describe.ts:80`). Refuse that blueprint at compile time | **M1.48** (g) |
| a call's failure | `Match.tags` over the callable's failure union, in place of the one mapping blank | later, new: needs callables to declare their failures |

**Why M1, not M2.** The first cut put the runtime items in M2.17 to M2.19. Aaron read the list and wrote "make sure
this is handled", so they move before the builder starts: what changes only the scaffold folds into M1.44 and M1.45,
and what changes the runtime or compiler is a new slice, M1.46 to M1.48. M1.43 needs M1.46, so Plugged In's handlers
are the first written against `subject`, `refs` and `id`. Each item has a red check (below).

## The worked example: `allowance.spend`

From acme's `blueprint/things/allowance/{machine,events,errors,roles}.ts` and `verbs/spend.ts`. This is the golden,
byte for byte (`e2e/fixtures/m1/scaffold-explains/allowance-spend.ts.golden`, on `claude/k16-checks`):

```ts
// Scaffolded from blueprint/things/allowance/verbs/spend.ts. Yours from now on.
import { Effect, Match } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/allowance/spend.handler.ts";

const { AllowanceExceeded } = Errors.declared;

/**
 * allowance.spend: Spend from what is left of this month's allowance.
 *
 * Who may call, from blueprint/things/allowance/roles.ts:
 *   the grantee of the allowance: (allowance, principal) => allowance.member === principal.person
 *
 * Payload, from blueprint/things/allowance/verbs/spend.ts:
 *   allowance  allowance.id
 *   amount     Amount
 *   memo       Memo
 *
 * Answer, from blueprint/things/allowance/verbs/spend.ts:
 *   remaining  Amount
 *
 * Refusals:
 *   AllowanceExceeded   exit 41  AL-001  yours to refuse below, carrying remaining; from blueprint/things/allowance/errors.ts
 *   AllowanceNotActive  exit 40  AL-900  the runtime's, when the allowance isn't in active, carrying state; from blueprint/things/allowance/machine.ts
 *   NotAllowed          exit 3   AR-001  the runtime's, when the caller isn't the grantee of the allowance; from blueprint/things/allowance/roles.ts
 *
 * Idempotent by request, from blueprint/things/allowance/verbs/spend.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/allowance/verbs/spend.ts: p95 150ms.
 *
 * The allowance's machine, from blueprint/things/allowance/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  grant   active     AllowanceGranted
 *   ▶ active     spend   active     AllowanceSpent
 *   ▶ active     spend   exhausted  AllowanceSpent
 *     active     revoke  revoked    AllowanceRevoked
 *     exhausted  revoke  revoked    AllowanceRevoked
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the grantee of the allowance;
 *   before it runs, it refuses AllowanceNotActive unless the allowance is in active;
 *   before it runs, it hands in the allowance it read as subject, so this handler never reads it again;
 *   each step is its own span: allowance.spend.load, allowance.spend.record;
 *   once it answers, it sets the allowance's state to the outcome given to move;
 *   once it answers, it writes AllowanceSpent: allowance, amount and memo from the payload, remaining from the answer;
 *   the call is the span allowance.spend, and its commit allowance.spend.commit.
 */
const spend: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span allowance.spend.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AllowanceExceeded: exit 41, AL-001.
    if (yield* Handlers.blank<boolean>("refuse AllowanceExceeded when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllowanceExceeded was refused"));
      return yield* new AllowanceExceeded({
        remaining: yield* Handlers.blank("AllowanceExceeded.remaining, an Amount"),
      });
    }

    // Step record: database, span allowance.spend.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move spend, from active: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome = yield* Handlers.blank<Outcome>("where spend ends: active or exhausted");
    yield* Match.value(outcome).pipe(
      // To active. From there the allowance can: spend (to active or exhausted), revoke (to revoked).
      Match.when("active", () => move("active")),
      // To exhausted. From there the allowance can: revoke (to revoked).
      Match.when("exhausted", () => move("exhausted")),
      Match.exhaustive,
    );

    return {
      // AllowanceSpent needs remaining, and only the answer can give it.
      remaining: yield* Handlers.blank("remaining, an Amount"),
    };
  });

export default spend;
```

Today's scaffold for the same operation is a short file: the description, two step blanks, one refusal with one
blank for all its fields, `move(yield* Handlers.blank("the move’s outcome"))` and one blank answer
(`design/evidence/M1.44/check-19-red.txt` shows the diff).

### What M1.46 adds to `allowance.grant`'s scaffold

grant names a member no role check reads (only the organisation's owner is checked), and creates. So its header gains
a refusal row and two runtime lines, and its answer uses the minted id (`handlers.test.ts`, "the scaffold shows what
the runtime hands in"):

```ts
 * Refusals:
 *   AllowanceLimitTooHigh  exit 44  AL-003  yours to refuse below, carrying cap; from blueprint/things/allowance/errors.ts
 *   PersonNotFound         exit 4   PE-901  the runtime's, when no person has that id, carrying id; from blueprint/things/person/thing.ts
 *   NotAllowed             exit 3   AR-001  the runtime's, when the caller isn't the owner of the organization; from blueprint/things/organization/roles.ts
 …
 *   before it runs, it reads the member and hands it in as refs.member, refusing PersonNotFound if there is none;
 *   before it runs, it mints the allowance's new id and hands it in as id;
 …
const grant: Handler = (_payload, { steps, move, id }) =>
  …
    return {
      allowance: id,
    };
```

### allowance's journey stubs

| # | File (`blueprint/journeys/…`) | Path | Expected |
|---|---|---|---|
| 1 | `allowance-grant-created-in-active.ts` | `(creates)` → active by `allowance.grant` | `AllowanceGranted`, in active |
| 2 | `allowance-spend-active-to-active.ts` | active → active by `allowance.spend` | `AllowanceSpent`, in active |
| 3 | `allowance-spend-active-to-exhausted.ts` | active → exhausted by `allowance.spend` | `AllowanceSpent`, in exhausted |
| 4 | `allowance-spend-refused-from-exhausted.ts` | spend from exhausted | `AllowanceNotActive { state: "exhausted" }`, no events |
| 5 | `allowance-spend-refused-from-revoked.ts` | spend from revoked | `AllowanceNotActive { state: "revoked" }`, no events |
| 6 | `allowance-revoke-active-to-revoked.ts` | active → revoked by `allowance.revoke` | `AllowanceRevoked`, in revoked |
| 7 | `allowance-revoke-exhausted-to-revoked.ts` | exhausted → revoked by `allowance.revoke` | `AllowanceRevoked`, in revoked |
| 8 | `allowance-revoke-refused-from-revoked.ts` | revoke from revoked | `AllowanceNotActive { state: "revoked" }`, no events |

Number 5, as its golden (`journeys/allowance-spend-refused-from-revoked.ts.golden`):

```ts
// Scaffolded from blueprint/things/allowance/machine.ts. Yours from now on.
import { Blueprint, noEvents, refuses } from "orthograph";
import { machine } from "../things/allowance/machine.ts";
import { grantee } from "../things/allowance/roles.ts";
import spend from "../things/allowance/verbs/spend.ts";

/**
 * One path through the allowance's machine, from blueprint/things/allowance/machine.ts:
 *   revoked  spend  refused AllowanceNotActive (exit 40, AL-900), because spend starts only from active
 * Refused: the grantee of the allowance calls allowance.spend on an allowance in revoked, and nothing changes.
 */
export default Blueprint.journey("allowance.spend: refused from revoked", {
  cast: { grantee },
  starts: Blueprint.todo("a starting world with an allowance in revoked"),
  steps: (s) => [
    s.step(
      "the grantee calls allowance.spend",
      s.grantee.run(spend, Blueprint.todo("allowance.spend's payload: allowance, amount, memo")),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      machine.isIn(Blueprint.todo("the allowance's id"), "revoked"),
    ),
  ],
});
```

Acme's own journeys already walk paths 3, 4, 5 and 6 (`journeys/spend-within-allowance.ts`,
`journeys/revoke-then-spend.ts`); the stubs show the other four as holes to fill.

## The checks (written first, red on `origin/m1`)

On `claude/k16-checks`, into `m1`, ahead of their build, like checks 16 to 18. Every one of the seven items Aaron asked
to have handled has a red check:

| Item | Slice | Red check |
|---|---|---|
| the header explains itself; Match; drift | M1.44 | `handlers.test.ts`: the golden, citations, no undeclared names; check 19: generate writes the golden and it compiles, the Match stops compiling on `frozen`, `check` warns on a new outcome and a new error |
| 7 · visibility in the header | M1.44 | `handlers.test.ts`: `memo  Memo (private: only the grantee of the allowance sees it)`, `remaining  Amount (secret: no caller sees it)` |
| 6 · stubs per path, role and declared error | M1.45 | `handlers.test.ts`: eight paths, sixteen stubs, five goldens; check 19: `add journeys` writes sixteen, compiling, never overwriting, blanks counted |
| 1 · the subject and what the payload names, handed in | M1.46 | `prehandle.test.ts`: `subject`, `refs.member`; `handlers.test.ts`: grant's header names `refs.member` |
| 2 · a generated not-found refusal | M1.46 | `prehandle.test.ts`: `PurseNotFound` and `PersonNotFound` before the handler, a role-gated miss staying `NotAllowed` (control); `handlers.test.ts`: grant's `PersonNotFound  exit 4  PE-901` row, spend has none; check 19: the model's `PersonNotFound` PE-901, `AllowanceNotFound` kept at AL-002 |
| 3 · a creating move's id minted | M1.46 | `prehandle.test.ts`: `id` handed in and committed; `handlers.test.ts`: grant's answer is `allowance: id` |
| 5 · one exit table for the CLI, HTTP and MCP | M1.47 | `refusals-table.test.ts`: an MCP refusal's `structured` carries refusal, code, exit, status; check 19: generated `errors.ts` exports `refusals`, with `exits` and `codes` read from it |
| 5 · an exit means one thing | M1.47 | check 19: `ortho model` refuses a declared exit of 2, 3 or 4 (the runtime's), 130 (the shell's), 41 twice in allowance, and 40 beside allowance's machine, each named; control: acme as shipped, with two things' machines both at 40, compiles |
| 4 · event fields enforced | M1.48 | check 19: `ortho model` refuses `AllowanceSpent.note`, naming the event and `allowance.spend`; control: an answer without `remaining` fails `tsc` (passes today) |

Counts: `handlers.test.ts` nine red, one existing passing; `prehandle.test.ts` five red, one control passing;
`refusals-table.test.ts` two red; check 19 ten red, two controls passing. Each fails on the unbuilt surface, not on a
typo: the scaffold differs from the golden, the handler type exports no `Outcome`, `machinePaths` and
`renderJourneyStubs` aren't exported, `add` has no `journeys` (USAGE), `check` prints `check ✔` with no warning, the
context has no `subject`, `refs` or `id`, a missing id reaches the handler, the model has no `PersonNotFound`,
`errors.ts` has no `refusals`, MCP's result has no `structured`, and `ortho model` accepts the unfillable event. The
red run is `design/evidence/M1.44/check-19-red.txt`.

## Slices

All five before M1.43, so Plugged In's handlers are written from the new scaffold, against what the runtime hands in,
and its journeys start from the stubs. `design/milestones.md` holds them, each with its done-when.

| Slice | What | Needs | Size | Builder effort (honest) |
|---|---|---|---|---|
| M1.44 | the scaffold explains itself: header with visibility and the runtime's lines, Match over a literal `Outcome`, drift warnings | M1.26 | M | about a day: the renderer and header sentences shared with docs and `brief`, `Operation`'s move type parameter, two lint rules |
| M1.45 | journey stubs per path, role and declared error; `ortho add journeys`; journeys with blanks in `model.blanks`, skipped by prove | M1.44 | M | half a day to a day: `machinePaths`, three stub kinds, a new `add` kind, the compiler and prove handling blanks |
| M1.46 | the runtime hands in `subject`, `refs`, `id`; `<Thing>NotFound` generated, adopted where declared, refused before the handler | M1.26 | L | a day to a day and a half: compiler (refusals, codes, `op.refusals`), generator (`notFound`, error classes), runtime (one read shared by role check, from-check and handler), acme's spend and grant simplified |
| M1.47 | one `refusals` table read by the CLI, HTTP and MCP; the compiler refuses an exit that is reserved, out of range or shared within a thing | M1.46 | S | three to four hours |
| M1.48 | the compiler refuses an event field nothing can fill | M1.26 | S | about two hours |

M1.44 and M1.46 run in parallel (different packages); M1.48 beside either. The grant header test ("the scaffold shows
what the runtime hands in") turns green with the later of M1.44 and M1.46. One builder in series: about four days. Two
builders (one on M1.44 then M1.45, one on M1.46 then M1.47 and M1.48): about two and a half days to all five green on
`m1`, plus review and CI. That is these five, not Gate M1, which also needs M1.38 to M1.43.

## Reversible

The header and body are the generator's text; changing them changes only new scaffolds, never one that is yours. The
drift rule is a warning that can be turned off by name. `add journeys` writes nothing unless asked. The signature
change has two callers.

**Follow-up (PR #90):** `ortho brief` gained one sentence, on what a database step wraps (`Records`: find, insert, update)
and that a move changes state, not fields (`packages/cli/src/modules/brief/service.ts`). The scaffold's header does not
say it yet. When M1.44 moves the header and brief sentences into `@orthograph/projections`, mirror it there.
