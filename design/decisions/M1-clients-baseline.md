# M1.12's client baseline is refreshed to post-M1.35

Decided 20 November 2026 by the Goal 3 lead; written by the checks author.

Check 14's test "generates the clients as the fixed renderers did apart from the options, exports all it did, and check passes" compares acme's
generated SDK, CLI and MCP with `e2e/fixtures/m1/clients/acme-baseline.json`, which was taken at m1 `3a99bd92`, before M1.35. M1.35 deliberately
removed `Errors.shown` in favour of `Errors.refusals`, one visibility rule for every output. The test therefore demanded an export the design
removed on purpose. The baseline is stale, not the build.

**The call.** The baseline is recaptured from acme's checked-in `generated/` (`node e2e/fixtures/m1/clients/make-baseline.ts`), and the
recapture is read against the old one before it is kept: every file digest the old baseline held is unchanged, every top-level export is
unchanged, and each thing's exports are unchanged except `Errors`, which drops `shown` and gains `refusals` (and `PersonNotFound`, an error
class the SDK now exports); the new `sdk/src/<thing>/types.ts` files are added. Nothing else the old baseline protected is given up. The baseline is now 52 files, not 44, and the check's consumers say so: the file count, and `carriesOptions`, which no longer counts a thing's `types.ts` as an operation's face (a type declaration takes no options), so the 15 operation faces are still 15. A control in
the same check (`missingExports`) fails when a real export is dropped, from the top level or from a thing, and passes on the whole baseline.

**Evidence.** M1.35 (the visibility slice, `refusals` for `shown`); the diff of the two baselines above; the control.

The test stays on `e2e/m1/expected-failing.txt` until acme mounts its clients (M1.12); it comes off the list when #162 lands.
