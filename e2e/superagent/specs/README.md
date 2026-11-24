# The three published specs, pinned

Goal 17's adapters are generated from each service's own published description of its API (K39). The checks use each
spec twice: **a fixture in this folder**, cut down so every check is fast and offline, and **the whole spec**, fetched
once into `tmp/specs/` (git-ignored) by `07-whole-specs`. `pins.json` holds what pins them; `pins.ts` judges it.

| | Spec | Version | Source | Size | Pinned by |
|---|---|---|---|---|---|
| GitHub | `GitHub v3 REST API`, OpenAPI 3.1.0, 842 paths, 1281 operations, 276 webhook entries (76 events) | `1.1.4` | `github/rest-api-description`, commit `c9c95fe34ced05fe076001f5c55704742bc8e7f8` (17 November 2026), `descriptions-next/api.github.com/api.github.com.json` | 14,395,662 bytes | the commit in the URL, and the file's SHA-256 |
| Slack | `Slack Web API`, Swagger 2.0, 174 paths and operations, no events | `1.7.0` | `slackapi/slack-api-specs`, commit `bc08db49625630e3585bf2f1322128ea04f2a7f3` (7 September 2021, the last one: the repository is archived), `web-api/slack_web_openapi_v2.json` | 1,237,332 bytes | the commit in the URL, and the SHA-256 |
| PostHog | `PostHog API`, OpenAPI 3.1.0, 2802 operations, no events | `1.0.0` (its `info.version` never moves) | `https://us.posthog.com/api/schema/?format=json` (the same URL without `?format=json` serves YAML), fetched 22 November 2026 | 21,573,241 bytes | the SHA-256 only |

The URLs and hashes are in `pins.json`, with the counts the oracle (`../spec.ts`) finds in each whole spec.

## Why a fixture, and how each is pinned

GitHub's and PostHog's whole specs are 14 MB and 21 MB: too heavy to keep in the repository, and a pull request's diff would
bury everything else. So the repository holds, for each, `<name>.trimmed.json`: **the same text the publisher wrote**, with every
path, webhook and component left out that nothing kept refers to (`trim.mjs` says which operations and webhooks are kept,
and why each neighbour is there). Kept: each call and event the superagent includes (`../needs.ts`), and some it does not
include, so "exactly the spec's calls" and "only what the mount includes" can both be told from "everything". GitHub's keeps
three actions of each of the six events it listens to (a full set is megabytes of payload schema) and two events it does not.

| File | Bytes | Operations | Events |
|---|---|---|---|
| `github.trimmed.json` | 886,334 | 21 | 8 |
| `slack.trimmed.json` | 33,002 | 6 | 0 |
| `posthog.trimmed.json` | 21,856 | 6 | 0 |

- **A fixture is its pin.** `00-the-oracle` fails if a fixture's SHA-256 is not the one in `pins.json`.
- **A fixture is the whole spec's.** `07-whole-specs` checks that each included call, and each action of each included
  event, is, in the fixture, equal to the whole spec's.
- **The whole spec is fetched, never committed.** `07-whole-specs` downloads each into `tmp/specs/<name>-<hash>.json`, once,
  and refuses a file whose hash is not the pin's (no network: one message naming `tmp/specs/`; CI caches it keyed on `pins.json`). GitHub's and Slack's URLs name a commit, so their bytes never change.
  PostHog serves its live schema and cannot be pinned by URL: if its hash has moved, `07` warns, judges what it served,
  and skips only the comparison of the fixture with the whole spec; the held plugins are judged against the committed fixture, which never moves. Re-pin as below.
- **No key.** All three URLs are public.

## Re-pinning

```bash
# fetch the new bytes (GitHub, Slack: put the new commit in the URL), then:
shasum -a 256 <file>                       # into pins.json: sha256, bytes, fetched
node e2e/superagent/specs/trim.mjs github <file> > e2e/superagent/specs/github.trimmed.json   # and slack, posthog
shasum -a 256 e2e/superagent/specs/*.trimmed.json                                             # into pins.json: trimmed.sha256
```

Then regenerate the held plugins from the new spec (`07` says which of their files differ) and update the counts in
`pins.json` to what `07` reports.
