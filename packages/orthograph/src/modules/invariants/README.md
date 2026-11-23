# invariants

Owns `Blueprint.invariant.unique` (G5): a rule that one value, or one tuple of values, belongs to at most one record of a
thing, within the states it is `while`. A rule is a named export of the thing's `invariants.ts`; the compiler gives it its
name and reads `fields`, `while`, `refuse` and `description`. Field and state references carry their thing in their type, so a
state or field of another thing, or a refusal with a field outside the key, fails `tsc`. Test: `invariants.test.ts`.
