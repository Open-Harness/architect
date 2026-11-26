# plugged-in

The link-in-bio app, Orthograph's one canon example (K13, K15), at stage 1: claim a `@name`, and keep a public page of
links. It declares three things, `handle`, `profile` and `link`, and their seven operations in `blueprint/`; each
operation's handler is written in `src/`, and the journeys in `journeys/` prove them, run by
`e2e/stage1/01-plugged-in-journeys.test.ts`. See `design/decisions/M1-plugged-in.md`.
