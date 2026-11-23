# Goal 17's checks: adapters from a spec (slice 3)

Written before slice 4 builds anything, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come
first"). Slice 4 builds `ortho new adapter <name> --from-openapi <spec>`, the conformance of what it makes, and the
GitHub, Slack and PostHog adapters with their stand-ins; these checks are its done-when. Every one is red today because
`ortho new` does not exist. This folder is also where the goal check `nx run e2e:superagent` grows: slices 6, 8, 10 and 12
add their halves beside these.

| Check | What it proves | Plugins it uses |
|---|---|---|
| `00-the-oracle` | the oracle the others judge by is sound: the pinned fixtures are the pinned bytes; every call and event the superagent includes is in its spec; each example fits its schema and each planted wrong value does not | none |
| `01-generates` | the three specs generate a plugin of exactly what each publishes (calls, events), with the generated-file header, byte for byte the same each time; hand-written files survive; refusals write nothing | generated into a project copy, from the fixtures |
| `02-includes` | a mount reaches only what it includes; an include of a call or event the spec doesn't have fails `ortho check`, naming the mount's file and the missing name; Slack's hand-written events | generated fixtures, and the held plugins |
| `03-calls` | each included call sends the request its spec describes, returns what came back whole, refuses a wrong answer and a wrong input, and fails with what the server said | the held plugins, against a probe the check writes |
| `04-stand-in-github` | each GitHub call passes against the stand-in over a bare repository: comments, a pushed branch and the pull request opened on it, reviews | the held GitHub plugin and its stand-in |
| `05-stand-ins-slack-posthog` | each Slack and PostHog call passes against its stand-in | the held Slack and PostHog plugins |
| `06-events` | each event the superagent listens to decodes what its service sends, whole, and refuses each wrong payload | the held plugins |
| `07-whole-specs` | the whole published specs (fetched once, hash-checked) generate; each generated file of a held plugin is what the generator makes of the pinned spec today | the held plugins; the full specs |

"The held plugins" are the ones the app holds, `examples/superagent/plugins/{github,slack,posthog}` (the brief's folder
tree): each is the generator's output for the pinned full spec, narrowed and extended by hand.

## What the builder must make, and where the checks read it

Anything the design settles is as `design/goals/17-superagent.md` says. These are the points it leaves open, fixed here
so a check can read them. A builder who needs one changed stops and asks its author.

1. **The command.** `ortho new adapter <name> --from-openapi <file or URL> [--root <project>]` writes `plugins/<name>/`
   under the project root. It reads JSON or YAML (PostHog's own URL, `https://us.posthog.com/api/schema/`, serves YAML;
   `?format=json` serves JSON), OpenAPI 3.x or Swagger 2.0. Its last line of output, exactly:
   `generated adapter <name>: <n> calls, <m> events from <title> <version>`, with `n` the spec's operations that have an
   `operationId`, and `m` its events (below). It refuses, exit not 0 and nothing written, with these words in its
   message: a file it can't read (`could not read <file>`), one that isn't JSON or YAML (`could not parse <file>`), a
   document that isn't OpenAPI or Swagger (`not an OpenAPI or Swagger description`), a spec with no operations
   (`no operations`), a missing `--from-openapi` (naming the flag), a name that isn't lower case words joined by dashes
   (`lower case words`).
2. **The one naming rule.** A call is named from its `operationId`: split at `/` and `.` into groups, then each piece
   camel-cased at `-` and `_`. GitHub's `issues/create-comment` is `calls.issues.createComment`; Slack's `chat_postMessage`
   and PostHog's `error_tracking_issues_list` have no separator, so they are flat: `calls.chatPostMessage`,
   `calls.errorTrackingIssuesList`. Dotted, a name is `issues.createComment`. An event is GitHub's own event, from each
   webhook entry's `x-github.subcategory`, camel-cased (`issue_comment` is `events.issueComment`); the spec lists it once per
   action (`issue-comment-created`...) and its payload is any one of them. The oracle is `spec.ts`.
3. **The plugin.** `package.json`: `name` `@orthograph/<name>`, `orthograph.kind` `"adapter"`, `orthograph.blueprint` a
   folder that exists, `exports["."]` the adapter's descriptor as its default export (`Blueprint.adapter`, with `calls`
   in groups of `Blueprint.call` and `events` of `{ kind: "event", schema }`), `exports["./client"]` the client (5), and
   a `scripts.build` if it needs one (the checks run `npm run build` from the repository's tools, offline). A plugin names
   its stand-in in `orthograph.standIn` (7).
4. **A mount.** `Blueprint.use(plugin, (p) => [p.include(p.calls.issues.createComment), p.include(p.events.issueComment)])`
   in `blueprint/adapters/<name>.ts`. `p.calls` and `p.events` are the descriptor's, so `p.calls.issues.createComment`
   typechecks. `ortho model --json` lists a mount's included calls and events, dotted, as `mounts.<name>.calls` and
   `mounts.<name>.events`. An include of something the adapter doesn't have is refused by `ortho check`, as the
   existing call message is: `<mount file>: includes the call issues.createComent, which @orthograph/github doesn't
   have (its calls: ...)`, and `includes the event issueComent, which ... doesn't have (its events: ...)`.
5. **The client.** `import { client } from "@orthograph/<name>/client"`;
   `client({ baseUrl, token? }).calls.<group>.<call>(input)` is a promise of the answer's JSON, as it came. The
   input is one flat object of the spec's path, query and body fields under the spec's names. `baseUrl` is the origin
   (Slack's `basePath` `/api` is added by the client). The token is sent as `Authorization: Bearer <token>` and never as
   a field (Slack's spec lists it as one); none given, no header. It refuses before sending anything: a missing
   required field, a field of the wrong kind, a field the spec doesn't have, no input. It refuses an answer that
   doesn't fit the spec's success schema. It fails with an object that has a string `_tag` and: `status` for an HTTP
   status of 400 or more; for Slack's `ok: false` answers (HTTP 200), `code` set to Slack's `error`. One spec
   correction is fixed here: Slack types `conversations.replies`'s `ts` as a number, and it is the string
   `1503435956.000247` Slack gives and wants, so a field the spec types as a number is also accepted as a numeric string
   and sent as written.
6. **Events.** `descriptor.events.<name>.schema` is an Effect schema of the payload the door receives. Decoding gives back
   the same JSON as went in: nothing the spec documents is dropped, nothing becomes a `Date`. Slack's `appMention` and
   `message` decode the **whole envelope** Slack's Events API posts (`type: "event_callback"`, `team_id`, `event_id`,
   `event_time`, `event`), written by hand from `slack-events.ts`; a bot's message arrives as a `message` with `subtype:
   "bot_message"`, a `bot_id` and no `user`.
7. **The stand-in.** `orthograph.standIn` is a file `node` runs: `node <file> --port 0 --dir <state folder>`. Its first
   line on stdout is exactly `stand-in listening on http://127.0.0.1:<port>`; on SIGTERM it stops, with no process left
   and nothing outside `--dir`. It needs a bearer token (any non-empty one) to write, and answers an unauthenticated
   write as the real service does (GitHub 401 with a `message`; Slack 200 `ok: false, error: not_authed`; PostHog 401).
   Each starts in the same world:
   - **GitHub:** repository `acme/widgets`, a real bare repository served by git's smart HTTP at
     `<base>/acme/widgets.git` (a clone and a push with `Authorization: Bearer ...` work), branch `main` with one commit,
     issue 1 open. Issues and pull requests share one numbering, so the first pull request is 2. A pull request needs
     an existing head and base branch (422 otherwise, and for a second open one on the same head); a line comment
     needs a path in the diff (422 otherwise); comments, reviews and line comments come back in the order made, and by
     `per_page` and `page`.
   - **Slack:** channel `C024BE91L`, the bot `U0BOT0001`. A `ts` is `<seconds>.<six digits>` and only goes up. A thread is its
     parent and its replies, in order, and holds only its own. `channel_not_found`, `no_text`, `thread_not_found`,
     `not_authed` as Slack gives them.
   - **PostHog:** project `1` (any other is 404) with three error tracking issues, two `active` and one `resolved`;
     `limit` and `offset` page the list; a status outside `active`, `resolved`, `suppressed` is 400; an update changes
     one issue only.
8. **Generated files.** Every `.ts` file the generator writes opens with `// Generated from <title> <version>. Do not
   edit.` (the title and version are the spec's `info`; no path, no time, so the same spec, as JSON or as YAML, from any
   path, generates the same bytes). A hand-written file opens with `// Scaffolded from <path>. Yours from now on.`.
   Running the command again puts every generated file back and touches no other file. `07` compares the held plugins'
   generated files with a fresh generation of the pinned spec, so an edited one fails.

Not fixed here, left to slice 4: how a plugin is built or packed (only that the checks can run its `build`), how the
generator derives errors and types, the secrets, the door's signature check, `catchUp` and `lend` (slices 10 and 11), and
the conformance harness's own interface: **"each included call passes against its stand-in" is `03`, `04` and `05`**.

## The specs

`specs/README.md` says which spec, how it is pinned, and why only a cut-down copy is in the repository.

## Running them

```bash
pnpm nx run e2e:superagent-ratchet     # every check, compared with expected-failing/ (red until slice 4 lands)
pnpm nx run e2e:superagent             # the checks alone: Goal 17's done check, once the list is empty
pnpm vitest run --root e2e --config vitest.superagent.config.ts superagent/01   # one file
```

`07` fetches GitHub's (14 MB), PostHog's (21 MB) and Slack's (1.2 MB) specs once into `tmp/specs/`; the first run needs the
network, and no key.

## Outside this folder, for whoever lands this

- `.github/workflows/ci.yml` needs an `e2e-superagent` job like `e2e-m8`'s, running `e2e:superagent-ratchet`.
- `tools/ci/builder-paths.sh` lets a `-build` branch shrink only M1's and M2's lists: add `e2e/superagent/expected-failing/`,
  or slice 4's builder cannot take its lines off the list.
- `e2e/project.json` and `e2e/vitest.superagent*.config.ts` register the checks, as M8's are.
