# bridge

The bridge's door: JSON over HTTP on a loopback port, which `main.ts` listens on and this module answers. It adds no behaviour:
it decodes a request, calls `sandboxes`, and says how it went.

| Route | Does |
|---|---|
| `POST /call/open` `/close` `/exec` `/write` `/read` `/list` | the adapter's calls (GOAL17-check-harness, call 4) |
| `POST /_stand/seen` `{ sandbox? }` | what a check reads: every sandbox's environment, commands with exit codes, refusals and loans (names only) |
| `POST /_stand/left` | the bridge's own count of folders and live processes |
| `POST /_stand/reset` | close every sandbox and remove any folder; the stand-in's `reset` |
| `GET /_stand/health` | `{ ok: true, service: "sandbox" }` |

An answer is `{ ok: true, answer }`. A declared refusal is `{ ok: false, error: { name, ...fields } }` with status 200, by the
name the adapter declares (`OutsideSandbox`, `BlockedCommand`, `SandboxGone`, `SandboxLimit`, and the open-time refusals
`CredentialLikeVariable`, `BadVariableName`, `InvalidBlocked`, `LoanExpired`, `BadLoanName`, `DaemonFailed`, `DiskFailed`); a request that
does not decode is status 400 `{ ok: false, error: { name: "BadRequest", what } }`; anything unforeseen is 500. The bridge listens on
loopback only and holds no credential: a loan's value arrives in one `exec` call and is gone when it ends. Test: `bridge.test.ts`.
