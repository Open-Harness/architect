# R2: publishing to npm by trusted publishing

Decided 26 November 2026 by Goal 18's lead, on Aaron's ask that day ("lets get trusted publishing up"). It serves Goal 18's
slice 12, publishing under `next` (`design/goals/18-framework.md`).

## The call

Orthograph's 14 public packages are published to npm only by `.github/workflows/publish.yml`, through npm's trusted
publishing (OIDC). No npm token is stored as a secret or anywhere else. The workflow:

- runs only when someone starts it from the Actions tab, and only on `main`;
- takes the version as its input, a preview `0.1.0-next.<n>`, and gives it to every package before packing, so each
  `workspace:` dependency is written as that exact version. The version in `package.json` on `main` is not changed by a
  run: it stays the last one a pull request set;
- packs each package with `pnpm pack`, which runs the preset's `prepack`, and publishes the tarball with `npm publish
  --tag next --access public`. npm attaches provenance itself;
- publishes in the order `tools/e2e/starter.sh` uses, skipping any `name@version` already on npm, so a run that stopped
  halfway can be run again;
- defaults to a dry run, which packs and checks and publishes nothing.

## Why

npm's trusted publishing gives each run a short-lived publish credential that only this workflow, in this repository,
can get. A long-lived write token can leak, and npm's granular write tokens expire in at most about ninety days.
`AGENTS.md` asks for no credential to be created without Aaron's yes; this way needs none.

## What it needs, once, from Aaron (npm's own rules, read 26 November 2026)

1. **The first publish is by hand.** npm sets a trusted publisher only for a package that already exists. Aaron
   publishes `0.1.0-next.1` once from his own machine: in a clone of `main`, run `pnpm install`, then
   `NX_DAEMON=false pnpm nx run-many -t build`, then `npm login`, then, for each package in the order above, `pnpm
   publish --tag next --no-git-checks` in its folder.
2. **Then each package trusts this workflow.** With npm 11.15 or later and two-factor sign-in on, run:
   `for p in orthograph @orthograph/compiler @orthograph/language-effect @orthograph/chain-evm @orthograph/lint
   @orthograph/portal @orthograph/projections @orthograph/generators @orthograph/host-cloudflare @orthograph/logbook
   @orthograph/prove @orthograph/preset @orthograph/cli create-orthograph; do npm trust github "$p" --repo
   Open-Harness/orthograph --file publish.yml --allow-publish --yes; sleep 2; done`
   npm offers to skip two-factor for five minutes after the first one.
3. **Within two days, the workflow publishes once.** npm expires a trusted publisher that hasn't published within two
   days of being set. Run `publish` with `0.1.0-next.2` and dry run off. After that, npm recommends setting each
   package's publishing access to "Require two-factor authentication and disallow tokens".

## Not yet

- The acceptance check against npm (slice 12's last step): run `e2e:acceptance` with its registry pointed at npmjs
  instead of a local Verdaccio, after a publish.
- Staged publishing (`npm stage publish`, a maintainer approving each release with two-factor) is not used. It can be
  added later by allowing `--allow-stage-publish` and switching the publish step.
