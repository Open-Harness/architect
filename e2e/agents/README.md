# Goal 10's checks: agents

Written before any of Goal 10 is built, by authors who build none of it (`AGENTS.md`, "Journeys and checks come
first"). They check `design/decisions/M4-agents.md` and the M4 rows Goal 10 lands (`design/goals/10-agents.md`). Each
check says which slice turns it green. The surface a check assumes beyond the decision is named in the check's own
folder README.

| Folder | Slice | What it proves |
|---|---|---|
| `durable/` | 4 (M4.04, #377) | a run killed with SIGKILL, in the tool phase or with the model's reply in flight, resumes from its SQLite file in a fresh process under the same run id; no committed step is requested or committed twice; request keys belong to their run and task; usage carries on; time and waits are the injected `Clock` and `Timers` (`durable/README.md` names the surface it assumes) |

## Running them

```bash
pnpm nx run e2e:agents-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check, the layout G9 gave M1; `../ratchet/README.md` says how the list works). It passes while every failure is listed.
`pnpm nx run e2e:agents` runs the checks alone, and is Goal 10's done check once the list is empty.
