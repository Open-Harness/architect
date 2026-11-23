# loans

`lend` (K40 fix 6): how a credential reaches a sandbox's process without being in the sandbox. An `exec` call may carry
`lend: [{ name, value, scope, expiresAt }]`, a short-lived token the adapter that owns the secret minted for one repository
(for GitHub, an installation token that expires by itself; the App's private key never leaves that adapter).

For that one call:

- the value is in the one process's environment under `name`, and nowhere else: not in `open`'s variables, not in the sandbox's
  recorded environment, not on any later call;
- an expired loan is refused as `LoanExpired`, so a stale token is never run;
- every occurrence of the value is replaced by `[redacted:<name>]` in the process's output and in the command line the bridge records;
- the bridge records each loan as `{ name, scope, expiresAt }` (never the value), which the portal lists.

The minting is the owning adapter's layer; this module is only what a sandbox does with what it is lent. Test: `loans.test.ts`.
