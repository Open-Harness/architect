# workflows: the workshop's publish, cut down

A draft is frozen into a revision, put to a vote by a stand-in operation, waits for the event that says the vote was
opened, waits out a 30-day cooldown on the world's clock, and is linked back. If no vote opens within seven days, the
revision is withdrawn instead. It is `design/decisions/M3-workflows.md` section 1's `publish`, whole.

| Path | What |
|---|---|
| `blueprint/workflows/publish.ts` | the declaration: six activities of three kinds |
| `blueprint/things/{revision,proposal}/` | the four stand-in operations (`freeze`, `open`, `link`, `withdraw`, each `idempotent: "request"`) and the event `ProposalOpened` |
| `src/workflows/publish.ts` | the handler: blank until M3.28 |
| `src/worker.ts` | the Worker the journeys run: blank until M3.28 |

Written by the author of the checks (M3.27); the journeys that judge it are in `e2e/workflows`.
