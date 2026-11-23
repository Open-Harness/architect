# things

Owns `Blueprint.thing` and `Field`. A thing is plain, frozen data: its description and its fields. Each field knows
the thing it belongs to, so `Organization.fields.id` used in the allowance is an edge the compiler can follow.

Invariants: no names (the folder names the thing); every thing has an `id` field; `structOf` turns any declared
fields into one Effect schema. Test: `things.test.ts`.

`lives` takes `"database"`, `"actor"` or a declared store (`stores`); the thing keeps the kind in `lives` and the store in
`store`.

Every thing carries `notFound` (K16, M1.46), the runtime's refusal of a missing instance: `{ kind: "not-found", thing }`,
generated as `<Thing>NotFound` (or the thing's own declared error of that name). A journey names it as `Person.notFound`,
the way it names a machine's `notFrom`.

What stays true among many instances is a rule (`Blueprint.invariant.unique`, G5), declared in the thing's `invariants.ts`, not on the thing.
