# M1-50-after-cutover: the one Graph is built in Goal 6, after its cutover, and Gate M1 does not wait for it

Goal 3's lead, 22 November 2026. A goal's own call, named by slug (K32).

## The problem

M1.50 is the one `Graph` for machines, the map and the worlds. Gate M1 (M1.15) lists it, so the preview merge to
`main` (K28, then M1.51's npm preview) waits for it. But M1.50 cannot be built in Goal 3 now:

- K29 section 7.3 puts the `Graph` back "on UI SDK in `@orthograph/shell`", once cutover (ST1.27) has deleted
  `@orthograph/portal-ui`. `design/milestones.md` already says `@orthograph/shell` for M1.50.
- `@orthograph/shell`, the portal, the map language and the theme are Goal 6's (its brief, `design/goals/06-portal.md`, is
  on `main`; `design/goals/05-ui-layer.md` says so too). Goal 3 never edits them.
- Check 40 (`e2e/m1/40-m1-50-graph.test.ts`, written on 21 November) still asks for `Graph` in
  `@orthograph/portal-ui` and `@xyflow/react` there. A builder working to it now would build on the package cutover
  deletes.

So M1.50 has no builder in Goal 3, and the M1 preview, which Goal 15's release (#542) waits on, would wait on Goal 6's
cutover for no reason of its own.

## Decided

1. **M1.50 is built in Goal 6, after its cutover**, in `@orthograph/shell`, as K29 section 7.3 says. Its "done when"
   is unchanged.
2. **Check 40 is rewritten by a checks author before that build**, to ask for the `Graph` in `@orthograph/shell` and
   `@xyflow/react` there. Its 21 entries stay in `e2e/m1/expected-failing/40-m1-50-graph.txt` until then. The builder
   never touches it. Check 40's generator half (positions laid out by `elkjs` in the generator, the graphs in the
   portal's data) is Goal 3's code; the author may split it out so Goal 3 builds that half here, if Goal 6 asks.
3. **Gate M1 is M1.02 to M1.14, M1.16 to M1.21, M1.25 to M1.36 and M1.38 to M1.49.** The preview merge goes ahead once
   those are green on `goal/stage-1`. Check 40 stays on the ratchet list, so a regression in what it already passes
   still fails CI.

## Evidence

- K29 section 7.3: "F7's names (`Grid`, `Chart`, `Chat`, `Board`, `Graph` and the rest) come back on UI SDK in
  `@orthograph/shell` … the graph with M1.50".
- `design/milestones.md`, M1.50's row: "One `Graph` in `@orthograph/shell`, on UI SDK".
- `e2e/m1/expected-failing/40-m1-50-graph.txt`, line 2 onward: "`@orthograph/portal-ui` exports `Graph`".

## Supersedes

- design/milestones.md: "M1.25 to M1.36, M1.38 to M1.50 | e2e" → "M1.25 to M1.36, M1.38 to M1.49 (M1.50 after Goal 6's cutover, M1-50-after-cutover) | e2e"
