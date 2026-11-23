# G4: a field can be declared unique, and a handler looks it up

Decided 19 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`, for snag S-04.

> **Spelling superseded by [G5](G5-invariants.md)** (19 November 2026): a unique rule is declared in the thing's
> `invariants.ts` as `Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken })`,
> the runtime refuses for the handler, and `findBy` takes the rule. G4's runtime stands: the store's partial unique
> index, a conflict on commit that retries, and the compiler's refusals. Until G5's slices land, the one-line
> `unique:` below is the working spelling, used in Plugged In only: `handle.name` and `handle.owner` while claimed,
> and `profile.handle` (snags S-22 and S-23, #139). G5's ST1.19 swaps all three.

## The problem, in code

Claiming a name is the first step of every Plugged In journey, and the handler has to ask "is this name taken?". It
can't: a handler's records read only by id.

```ts
// packages/language-effect/src/modules/records/types.ts:73
export class Records extends Context.Service<Records, {
  readonly find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  readonly insert: <T extends Thing>(thing: T, fields: FieldsOf<T>, state?: string) => Effect.Effect<void>;
  readonly update: <T extends Thing>(thing: T, id: string, changes: Partial<FieldsOf<T>>) => Effect.Effect<void>;
}>()("@orthograph/language-effect/Records") {}
```

The journey author's scratch handlers proved the spec satisfiable only by reaching `Store.list`, which a handler
can't (S-04).

## The options

| | A · a declared unique field, looked up by it (chosen) | B · `Records.findBy(thing, field, value)` on any field | C · let handlers page through `list` |
|---|---|---|---|
| two claims of one name at once | the store refuses the second commit; its retry finds the first and refuses `HandleTaken` | both see none, both insert: two owners | the same race, and a scan per claim |
| falls out of the blueprint | the docs, model and portal show "unique while claimed" | nothing to show | nothing |
| a thing that lives as actors | refused by the compiler: one instance per actor has nothing to be unique among | silently wrong | `list` has none |
| reversibility | additive: a new declaration and one read | additive | none needed, but wrong |

## The call

1. **The declaration.** A thing names its unique fields, each scoped to the states in which it must be unique:
   `unique: { name: { while: ["claimed"] } }` on `Blueprint.thing` (or `Blueprint.unique(...)`, whichever the builder
   finds fits `Blueprint` best; the check pins behaviour, not spelling). Without `while`, unique in every state. A
   released handle keeps its name and frees it, which is what Plugged In's release journey needs.
2. **The lookup.** `Records.findBy(thing, field, value)` returns the one instance holding `value` within the scope, or
   undefined. It type-checks only for a declared unique field. Like `find`, it sees this call's own writes first.
3. **The store enforces it at commit.** The database store keeps a unique index over the scope (D1: a partial unique
   index, `WHERE state IN (…)`). A commit that breaks it is a conflict, never a defect: the call retries, and the retry's
   `findBy` sees the winner, so the handler refuses with its declared error.
4. **The compiler refuses** a unique field on a thing that lives as actors, a `while` naming a state the machine
   doesn't have, and a unique field that isn't a field of the thing, each naming the thing's file.
5. **It falls out:** the model carries `unique`; the docs and the portal say "unique while claimed".

## What follows

- A checks author plants the check (a fixture project, not Plugged In); a builder makes it pass; then the journey
  author declares `name` unique while `claimed` on Plugged In's `handle`, and the climber's claim can be written.
