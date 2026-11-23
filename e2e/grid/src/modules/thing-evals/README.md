# thing-evals

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`.

## The matrix: `thing.sdk` and `machine.sdk`

The SDK's types are judged by what the TypeScript checker says they **resolve to**, over the SDK's own files with the blueprint modules they import
stood in by modules written from the model (`../sdk-types/README.md`). Spelling is never the test: `Of<F> = never`, `Of<F> = F`, `Declared = any`,
`Record<string, unknown>`, `Number`, `| Promise<void>` and an index signature all fail because of what they resolve to.

Each field's stand-in carries its own tag (`<thing>.<field>`), so a member derived from another field of the same kind (`organization: Of<Declared["member"]>`, two
named schemas swapped) is red, and an intersection (`Of<…> & Record<string, any>`) is judged part by part (`sdk-types.test.ts`, "a member derived from another field").

Every SDK type the evals judge (rows) against every rule (columns). Each cell is **enforced**, with the test that plants it, or **n/a** with its reason.
The output schema's own matrix is in `../output-schema/README.md`.

| Column | Rule |
|---|---|
| A | resolves to what the model says (string for an id or text, number or bigint for a uint, boolean for a boolean, the declaration's own type for a named schema) |
| B | refuses each wrong kind (another primitive, an array, null, a boxed or callable type, a Promise, an index signature) |
| C | a field the model has is a member, and the type has no index signature taking any other |
| D | refuses a value-less type for a required field (`undefined`, `never`, `any`, `unknown`, `{}`) |
| E | optional exactly when a call may leave the field out: a required one may not be `?` or `\| undefined`, an optional one must be |

| Row | A | B | C | D | E |
|---|---|---|---|---|---|
| `<Thing>` required public field | `sdk-types.test.ts` "the real file"; `thing-evals.test.ts` "green: the file the generator writes" | `sdk-types.test.ts` "a member typed as something that holds no usable value" and "a tampered helper type" | "a type that leaves out a field", "an index signature on the type" | the same list (`undefined`, `never`, `any`, `unknown`, `{}`) | `sdk-types.test.ts` "a required field written optional or with undefined" |
| `<Thing>` optional or role-private field | "a derived type follows the declaration's own optionality" | by A's rows | n/a: a field the model lets a call leave out is still a member, judged by the same row | the same | "an optional field spelled out as required; green: spelled optional" |
| `<Thing>.state` (machine.sdk) | `machine-evals.test.ts` "green: the real file" | "matrix State type": `string`, a derived type, another type, one state, an extra literal, `\| undefined` | n/a: the `state` member's absence is its own red (`sdk-types.test.ts` "no state member at all") | n/a: a union of literals cannot be value-less (anything else is B) | `\| undefined` is red: the state is never absent |
| exported `<Thing>State` (machine.sdk) | `machine-evals.test.ts` "green: the real file" | "an exported LinkState holding a value that is not a state, or a plain string" | n/a: an alias has no members | n/a: as above | n/a: an alias is never absent |
| event types | n/a: `event.sdk` is not switched on (K14 Q3, held off) | n/a | n/a | n/a | n/a |
