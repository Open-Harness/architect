# Goal 10's checks: agents

Written before any of Goal 10 is built, by authors who build none of it (`AGENTS.md`, "Journeys and checks come
first"). They check `design/decisions/M4-agents.md` and the M4 rows Goal 10 lands (`design/goals/10-agents.md`). Each
check says which slice turns it green. The surface a check assumes beyond the decision is named in the check's own
folder README.

| Folder | Slice | What it proves |
|---|---|---|

## Running them

```bash
pnpm nx run e2e:agents-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check, the layout G9 gave M1; `../ratchet/README.md` says how the list works). It passes while every failure is listed.
`pnpm nx run e2e:agents` runs the checks alone, and is Goal 10's done check once the list is empty.
