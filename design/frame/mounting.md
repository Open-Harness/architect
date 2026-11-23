# Mounting, and where everything lives

Part of the frame ([`README.md`](README.md)). Proposed, 17 November 2026.

## What a mount is

A mount is one small file that says "use this plugin here, like this". It is the only thing a plugin puts in
your project. The plugin's declarations, handlers and journeys stay in its package, pinned to one version.

```ts
// blueprint/features/wallets.ts: the mount is called `wallets`, after its file
import { Blueprint, Via } from "orthograph";
import wallets from "@orthograph/wallets";
import list from "@orthograph/wallets/blueprint/things/wallet/verbs/list.js";
import importKey from "@orthograph/wallets/blueprint/things/wallet/verbs/import.js";

export default Blueprint.use(wallets, (w) => [
  w.choose(w.choices.signer.browser.injected),           // choose: a signer wallets has proved
  w.narrow(list, { via: [Via.session, Via.device] }),    // narrow: fewer ways in
  w.omit(importKey),                                     // omit: acme doesn't import keys
]);
```

Four verbs, the same for every kind of plugin, and only four, because each keeps the plugin's proof true:

| Verb | What it does | Used by | Why it is safe |
|---|---|---|---|
| **choose** | picks one of the options the plugin offers (a signer, a CLI's command name) | features, adapters, projections | the plugin proved each option in its own CI |
| **include** | names which of an adapter's calls and events are reachable; nothing else of the outside system is | adapters | the app reaches only what it named, and `impact` knows exactly that |
| **narrow** | removes ways in, or operations: `narrow` on a feature's operation, `via` and `takes` on a projection | features, projections | fewer callers can't break a journey that passed with more; journeys needing the removed way are skipped and named |
| **omit** | drops an operation | features | nothing of the app's may call it; `check` fails if anything does |

A choice never varies by environment. A value that must differ between environments, such as which chains a wallet
links for, is a **setting**: the plugin declares it, and each environment gives it
(`settings: [wallets.settings.chains.is([1, 8453])]` in `environments/production.ts`).

There is no "override". If an app needs a feature's operation to behave differently, it writes its own operation over
what the feature exports (acme's `organization.refund` over the payments feature's `Payments.refund`).

## Where everything lives

```text
blueprint/
  things/<thing>/        your own things, machines, events, errors, roles, verbs: the root feature
  values/                your named types
  secrets.ts             your own secrets, by export
  features/<name>.ts     one mount each: what else the system is
  adapters/<name>.ts     one mount each: what is outside it
  projections/<name>.ts  one mount each: what it becomes
  environments/<name>.ts where each projection lives this time
  journeys/<name>.ts     stories, written by another agent
  starting-worlds/<name>.ts
src/                     handlers and client code: the only hand-written logic
generated/               never edited
package.json             the plugins' packages, pinned exactly
```

## Q: Where do projections live?

Aaron asked to push on this. The first sketch put features in `blueprint/` and projections in the project's config file.

**The problem, in code.** Today the config names the outputs, and nothing reads it:

```ts
// examples/acme's config file (origin/layer/3, before M0)
export default Blueprint.config({
  name: "acme",
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true },
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true, oauthProvider: true }),
});
```

`later.md` (D3 #112): the generators "name the CLI from the project's folder", so `cli: "acme"` renames nothing.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the generators | today one renderer per output key; tomorrow one per mounted projection |
| environments | `deploy: { server, mcp, portal }` and `publish: { sdk, cli }` are keyed by the same fixed names |
| the names rule | "a declared name is never written as a string": an object key like `cli:` is a name |
| `auth` in the config | becomes the auth feature's mount |

**The options**

A · Projections in the config:

```ts
// ortho.config.ts
export default Blueprint.config({
  projections: [server(), sdk({ package: "@acme/sdk" }), cli({ command: "acme" }), mcp(), docs(), portal()],
});
```

B · Everything mounted the same way, one file each (recommended):

```ts
// blueprint/projections/cli.ts: the public CLI, command `acme` from package.json's name
export default Blueprint.use(cli, (c) => [c.command.fromProject, c.via([c.via.device, c.via.key])]);

// blueprint/projections/cli-admin.ts: a second CLI from the same plugin, for operators, with its own way in
export default Blueprint.use(cli, (c) => [c.via([c.via.key]), c.takes((op) => op.allowed.includes(operator))]);
```

([`projections.md`](projections.md) section 2 has both in full.)

C · Keep fixed outputs, read the config's names (today's design, finished):

```ts
outputs: { server: true, sdk: "@acme/sdk", cli: "acme", mcp: true },   // one of each, renamed
```

**You do X → what happens**

| Scenario | A · config | B · mounted | C · fixed |
|---|---|---|---|
| Add a staff-only CLI beside the public one | two entries in an array, no name for either | a second file; its name is its file's name | impossible |
| Turn off MCP | delete a line | delete a file | `mcp: false` |
| An environment places the CLI | needs a name for an array entry | imports the mount by path | a fixed key |
| A newcomer asks "what does this app become?" | one file | one folder listing | one file |
| A third party ships a new projection (say, a Python SDK) | add to the array | `ortho add projection` | a framework change |

**Rubric**

| Axis | A · config | B · mounted | C · fixed |
|---|---|---|---|
| Floor-first | ✅ small change | ✅ small change, same as features | ⚠️ ships, but keeps the ceiling |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ⚠️ generators, environments | ⚠️ generators, environments | ✅ generators only |
| Correctness | ⚠️ array entries have no names | ✅ names from paths, one per mount | ✅ |
| Fit | ⚠️ a second way to add a plugin | ✅ one way for every kind; no loose file | ❌ projections stay special |

**Recommendation: B.** One verb for every plugin (`ortho add <kind> <package> [--as <name>]`), one file per mount,
names from paths, and no loose config file. The question "what does this app become?" is answered by
`ls blueprint/projections`, the same way "what is it?" is answered by `ls blueprint/things`.

## What mounting does, stage by stage

| Stage | What happens |
|---|---|
| `ortho add feature @orthograph/wallets` | pins the package exactly, refusing a version under three days old, unless overridden; writes the mount with the plugin's default choices; resolves the plugin's needs (below) |
| compile | folds the plugin's declarations into the model under the mount's name; each carries `from: wallets@1.2.0` |
| check | names clashes, unmet needs, a narrowing that would empty an operation, an app operation that calls an omitted one, an adapter event the mount includes that no operation takes |
| generate | every projection sees the feature's operations like the app's own; the feature's handlers are imported from its package, never copied |
| scaffold | nothing for a feature (it arrives with no blanks); for an adapter call, the error mapping in your handler is the blank |
| secrets | the plugin's secrets join every environment, named from mount and export ([`secrets.md`](secrets.md)) |
| prove | the feature's journeys run in the app's worlds, through the app's projections, beside the app's own |
| `ortho upgrade wallets` | compares the two versions' models: new operations are a minor change to the app, a changed payload a major one; `impact` names what in the app is now stale |
| `ortho remove wallets` | refuses while anything of the app's uses it; otherwise removes the mount, and generate removes the rest |

## Needs

A plugin names the plugins it needs in its own descriptor, and mounting resolves them:

```ts
// @orthograph/wallets/blueprint/feature.ts
export default Blueprint.feature({
  needs: [auth, Blueprint.need(eip1193, { when: signer.browser.injected })], // eip1193 only with a browser signer
  // choices, exports … (writing-a-feature.md)
});
```

The calls a plugin uses of a needed adapter (wallets uses `eip1193.calls.personalSign`) are checked against what the
app's mount of that adapter includes.

`ortho add feature @orthograph/wallets` finds a mount that satisfies each need, or offers to add one. A need is never
satisfied by a copy inside the plugin, so the app has one auth, one Stripe and one browser wallet, however many features
use them.

## Names and clashes

- A mount's name is its file's name. If it matches the plugin's own name (`wallets.ts` for `@orthograph/wallets`), the
  plugin's things keep their names: `wallet`, `wallet.link`. If it differs (`usdc.ts` for `@orthograph/erc20`), they
  are prefixed with it: `usdc-token`, `usdc-token.transfer`. That is how one plugin is mounted twice.
- Two things with the same name, from the app and a feature or from two features, are a `check` error naming both files.
  The fix is to rename a mount, or to adopt one of the things under the app's own name (K22).
- Error and refusal codes are prefixed by the mount, so two mounts can't share a code (D3 #84's unique prefixes).

## Auth, mounted rather than copied

Today the starter copies `person` and `session` into every new project, and they become the project's own
(D2 #61, `examples/starter`). Under this frame, auth is a feature like any other: `npm create orthograph acme` mounts
`blueprint/features/auth.ts`, and `person`, `session` and the sign-in pages come from its package. A project that wants
its own sign-in writes its own feature and mounts that instead. Organizations, memberships and invitations stay acme's
own things, as D2 #61 decided.

## Open questions

- Whether a feature's journeys run with the feature's own starting worlds, the app's, or both. The proposal: a feature
  brings starting-world fragments (a person with a linked wallet), and the app's starting worlds may include them.
- Narrowing by the app's own roles is not offered: K1 left it to `via` and `omit` so it is provably tighter
  ([`../decisions/M1-plugins.md`](../decisions/M1-plugins.md) section 3).

The exact descriptor, mount and verb surface is [`../decisions/M1-plugins.md`](../decisions/M1-plugins.md).
