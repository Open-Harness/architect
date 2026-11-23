# environments

Owns `Blueprint.environment({ ... })`. The declaration carries no name: `blueprint/environments/staging.ts` is the
environment `staging`, and the compiler takes the name from the path. It says how the environment runs, who its callers
are, where its state lives, which secrets it needs by name, what it promotes from, and where each output is deployed or
published. The clock is declared here (`Blueprint.clock`, owned by the time module); chain and keeper come with layers four and five. Test: `environments.test.ts`.
