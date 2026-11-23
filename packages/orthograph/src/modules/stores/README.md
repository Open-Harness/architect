# stores

Owns `Blueprint.store.database()`, `Blueprint.store.actor()` and `Blueprint.store.kind(name)` (K3 items 1 and 2). A
store is plain frozen data: its kind. Its name is the file's, `blueprint/stores/<name>.ts`; a thing names it with
`lives: ledger`, and none names it at all to live in the project's default store. The kind says which host supplies the
store; the compiler refuses a kind the host doesn't. Test: `stores.test.ts`.
