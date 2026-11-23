# api

The `api` projection: `generated/api/`, the contract. One endpoint per operation, built from the operation's own
declaration and never copied; the wire errors, the events, and the handler's type. An operation that runs on the device has
its declaration there and no route. Pure: the model in, files out. Test: `api.test.ts` (acme's committed `generated/api/`).
