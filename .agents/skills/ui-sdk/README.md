# UI SDK's own skill, vendored

`SKILL.md` and `references/` are UI SDK's skill for building with it, copied unchanged from
`github.com/vercel-labs/ui`, path `packages/core/skills/ui-sdk/`, at the tag `@ui-sdk/core@0.1.0-beta.7`
(commit `5152971c75058ab263e6acb1e6d15fcedd9d7ce5`, 17 November 2026). That is the version K24 pins.

- **Licence.** Apache-2.0, in `LICENSE`, copied from the root of the same commit. The repository has no `NOTICE`
  file at that commit, so there is none to keep. We changed none of the copied files; this README is ours.
- **Read on 21 November 2026** by the 📐 designer thread for K29, every file, before it was committed. Between beta.7
  and beta.13 (the newest published, 19 November) the skill changed in two lines only: Solid's minimum version, and
  `settle()` from `@ui-sdk/core/testing` for waiting in tests.

## How Orthograph uses it

UI SDK is the interface base (K24). The UI layer's shape is K29 (`design/decisions/K29-ui-layer.md`). Read this skill
when you write any of these:

- **A generator's template** for the generated pieces (one per operation and read). The pieces are emitted, never
  written by hand against UI SDK (K24, decision 1). The skill's rules on names, `Field` and `Input`, `Button` and the
  three agent marks are what the templates must produce.
- **A hand-written page** in an app's `src/web/`, composed from generated pieces and UI SDK's components. Path 1,
  "Build an interface", applies.
- **A component of the app's own** that nothing generated fits, like an editor. Path 2, "Build a component", applies:
  one `definePrimitive`, its agent-readable state listed in `controlled`, its `agent.actions` named. Anything it saves
  goes through a generated action, never a fetch of its own.
- **`@orthograph/shell`'s and the new portal's components** (`packages/portal-next`, K31 and Goal 6), built on UI SDK
  from the start. `@orthograph/portal-ui` is not ported: it is deleted at cutover (K29 section 7).

Where this skill and Orthograph's rules disagree, ours win: `AGENTS.md` (Effect, no `async` outside entry files,
pinned versions, the six-slot module shape) and the generated-file header. The skill's own docs live in each
installed package (`node_modules/@ui-sdk/<framework>/docs/llms.txt`); read those for the version installed, not the
website.

## Updating it

Copy the folder again from the tag of the version the workspace pins (R1: at least three days old), read every file,
update the commit, version and date above, and say in the pull request what changed.
