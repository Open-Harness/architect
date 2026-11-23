# environment

What a sandbox's processes can read (GOAL17-check-harness, call 4; K40 fix 6). Exactly: the four the bridge always sets
(`SUPERAGENT_DIR`, `SUPERAGENT_NAME` the owner, `SUPERAGENT_TICKET` the tag, `SUPERAGENT_BLOCKED_COMMANDS`), then each source's
`environment.of` variables, then Settings' `variables`. A name must match `^[A-Z][A-Z0-9_]{0,63}$` and contain none of
TOKEN, SECRET, KEY, PASSWORD, PASSWD, CREDENTIAL or AUTH, or `open` fails as `CredentialLikeVariable`: the bridge refuses
a credential even when the app's own check let one by. A credential reaches a process only as `exec`'s `lend` for that call
(the `loans` module), never here.

`processEnv` is what a process is started with: these variables, `PATH` (the shims first, then the system's), `HOME` (the
sandbox's folder), `TMPDIR` (`.tmp` in it, so the temporary files Pi's tools make are inside the fence), `LANG` and nothing of the bridge's own environment, so a key the bridge was started with is not readable.
Test: `environment.test.ts`.
