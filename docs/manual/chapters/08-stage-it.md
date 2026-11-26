# Stage it

Film: `docs/explainer/films/stage/`

Plugged In is green on your machine, and you have run it there and read a trace. Nobody else can reach it. To give
it a real address, something has to be made in a cloud account that you pay for, and what runs there has to be the
thing that was proved, not something built again on the way. You want to see both before anything is made.

## Read where it will run

We want to know what staging is before we ask for it. It is one short file of the blueprint, an
[environment](../../canon/languages-and-hosts.mdx), and you can read it whole.

```ts file=examples/plugged-in/blueprint/environments/staging.ts lines=4-9
export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() },
});
```

One server on Cloudflare, one database, and real sign-in where your machine had fixed test people. Staging also
needs a value for every secret the app declares, so we ask what it declares.

```sh capture=stage-secrets.txt
$ ortho secrets --env staging
no secrets declared
```

Plugged In declares none, so nothing is owed. An app that had some would see their names here, never their values.

## Ask for the plan before anything is made

We want the list of what will exist in the account, and we want it without touching the account. A staging in the
cloud is made for one run, and you give the run a short name. The command that makes it prints its plan first.

```json capture=stage-plan.txt
$ ortho env up staging --plan --run demo1
{
  "app": "plugged-in",
  "environment": "staging",
  "run": "demo1",
  "prefix": "ortho-pluggedin-stg-demo1",
  "resources": [
    {
      "kind": "worker",
      "name": "ortho-pluggedin-stg-demo1-worker"
    },
    {
      "kind": "d1",
      "name": "ortho-pluggedin-stg-demo1-db",
      "binding": "DB"
    },
    {
      "kind": "durable-object-namespace",
      "script": "ortho-pluggedin-stg-demo1-worker",
      "class": "World"
    }
  ]
}
```

Read it as the owner. Three things will exist: the server, its database, and a namespace that belongs to the server.
Every name starts with the prefix, and the prefix is the app, the environment and the run. That is also how the run
is cleaned up. We recorded `ortho env destroy staging --plan --run demo1` too, and it prints this same document.

## Build it once

We want staging to run the exact file that was proved, so the app is built once, from a commit, and never again for
another environment.

```sh capture=stage-build.txt
$ ortho build
built aae9721e sha256:6604eb7f85b9037a4b329735409d0cde38be9be9d189f333d2cdc3588c75cfba
```

The first word after "built" is the commit, cut short. The long one is the fingerprint of the file. Those two
are what you will ask any address for.

## Run the same file here first

Before the account comes into it, the same file can run as staging on your machine. With a port and no run,
`ortho env up staging` starts it and leaves it running. Then we ask it what it is.

```sh part capture=stage-bundle-http.txt
{"revision":"aae9721e","sha256":"6604eb7f85b9037a4b329735409d0cde38be9be9d189f333d2cdc3588c75cfba"}
```

The same commit and the same fingerprint that the build printed. It stays up until you stop it.

```sh capture=stage-local-down.txt
$ ortho env down staging
staging down
```

## The step that needs your account

Now the real one: the same command, without the word plan.

```sh capture=stage-up-no-account.txt
$ ortho env up staging --run demo1
CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not set: the staging deploy reads both from the environment, and no connection was made
exit 2
```

This is as far as we recorded. The command wants two values from your cloud account, and without them it stops
before it contacts anything. They are yours. You put them in your own shell, or in the secret store of wherever the
command runs, and no agent is handed them or prints them.

What follows is what the command's own notes say (`packages/cli/src/modules/staging/README.md`), and none of it is
recorded here. With the two values, it makes the database, uploads the built file, turns the address on, and waits
for three good answers before it gives you the address. Then `ortho prove --env staging --run demo1` runs the
journeys against that address, and `ortho env destroy staging --run demo1` removes everything the run made.

## When it goes wrong

The build refuses when anything in the repository is not committed, because a bundle has to be one commit.

```sh capture=stage-build-dirty.txt
$ ortho build
refused: the working tree differs from aae9721e: commit or stash what changed before building a deployable bundle
exit 2
```

A run's name is small on purpose, because it becomes part of every name in the account.

```sh capture=stage-bad-run.txt
$ ortho env up staging --plan --run Demo-1
--run needs a run id of 1 to 20 lower-case letters and digits (got "Demo-1")
exit 2
```

Proving a staging has to know where your account puts its Workers, and it will not guess.

```sh capture=stage-prove-no-address.txt
$ ortho prove --env staging --run demo1
ORTHO_STAGING_SUBDOMAIN is not set: one label of lower-case letters, digits and dashes, 1 to 63, not starting or ending with a dash
exit 2
```

Moving a proved build on by its verdicts did not get as far as a verdict on Plugged In.

```sh capture=stage-promote.txt
$ ortho promote --to staging
promote couldn't run: no logbook: start one with `ortho env up logbook`, or set ORTHO_LOGBOOK_URL
exit 2
```

We tried `ortho env up logbook` as well, and it asked for a policy that only a pipeline has. So on your own machine
you stage with the commands above, and promote waits for one.

And a deploy can die halfway. The notes say destroy needs nothing from the run that failed: it lists the account
and deletes what carries the run's prefix. We have not recorded that either.

## How this stands

The plan, the build, staging on this machine and every refusal above run today, and were recorded on Plugged In on
26 November 2026 with no cloud account. The real deployment in this chapter is not recorded. It waits on the owner's
credential, and it will be recorded when he gives it. So this chapter shows the path to a real address, and no
address.

The status page (`docs/canon/status.md`) says the same. The plan and the two commands are built, proved with no
credential and no network. A live staging run is building: in this repository it is a workflow started by hand.
A deploy that stays up, with a public address, is provisional, and so staging here is made for a run and destroyed.
Secrets are building, and so are the logbook and promote, proved on another example and not on Plugged In, which
declares no production. The canon has no page on environments yet, so the link above goes to the nearest one. Who
holds the two values is practice, and the framework only never prints them.
