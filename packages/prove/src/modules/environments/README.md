# environments

`Environments.up|down|status({ root, name })`: a long-lived local environment (`test`, `staging`, `production`) as D3 #4
decided. Each runs the revision's built `main.js` unchanged (`no_bundle: true`, from `Build`) on its own `wrangler dev`
through `Worlds.launch`, so it has its own D1 and Durable Object state, its own inspector port and its own secrets.
Everything it keeps is under `.ortho/environments/<name>/`: `wrangler.jsonc` (the generated server's config with its
source swapped for the bundle, its worker and database named for the environment, and the bundle's revision and hash as
vars, which is what `GET /_ortho/bundle` answers), `secrets.env` (mode 0600, passed to wrangler as `--env-file`,
never as `--var`), `state/` (`--persist-to`, kept across restarts), `pid`, `port`, `bundle.json` and `wrangler.log`.
Which environments exist, and that `local` is not one of them, comes from the model's `environments`.

`up` leaves a running environment alone, builds the revision when it has no artefact, and with a `revision` restarts a
running environment onto that bundle with its state kept (what `promote` does, L2.05). `down` stops the whole process
group and is not an error on an environment that isn't running. Test: `environments.test.ts` (ports 8950 to 8999).

Three environments are more than the revision's bundle (D3 #50 to #52, #91):

- **One that declares a `lifetime` hosts worlds** (the test environment). `up` starts a collector of its own first
  (`Collectors.launch`, a container named for the folder, writing `telemetry/`), and puts `OTLP_URL` and
  `ORTHO_WORLDS=1` in its config, which opens `/_world/worlds` (see `test-worlds`). `down` removes the container.
- **One that another environment is promoted from** (`promotesFrom`: staging) records telemetry too: the same collector and
  `OTLP_URL`, without `ORTHO_WORLDS`, because `promote --to staging` proves it where it runs and `watch` reads the same
  folder. Its collector is a process of its own (the pinned binary, stopped by `down`), and one already running without a collector is restarted onto one.
- **`logbook` is the logbook's own worker** (`@orthograph/logbook`, L2.03), started with `policy` (issuer, repository,
  refs, workflows: `ORTHO_OIDC_*` in the CLI) through `Logbook.launch`, with its state, pid and port beside the
  others'. It has no bundle, so its status carries no revision.

L2.O: `up` resolves the environment's `telemetry` sinks (`Sinks.resolve`) and hands the secrets to the process through its environment (`env`, a
parameter: only an entry file reads `process.env`); a skipped sink comes back as `notes`. An environment's status carries its Collector's address
(`collector`), where prove sends the journey's span.

`verify({ root, name, pid, revision, sha256 })` checks that the live process still has the captured PID and its own
bundle endpoint still reports the expected bytes. It checks the live PID around the HTTP read, so an ordinary restart
or rollback cannot inherit an in-flight proof merely by returning to the same hash (D3 #165).


Persisted process ownership (D3 #190) is the same for `status` and `down`/restart cleanup. A PID file alone, a live
process group, or the word `wrangler` is insufficient. Wide process inspection must show the Node-launched pinned
wrangler entry in `dev` mode, with exactly this environment directory's `--config` and `--persist-to` arguments.
The ordinary config is `<environment directory>/wrangler.jsonc`. A logbook uses its package-owned config beside the
public package entry's `src` or `dist` folder, shared by every logbook, so its derived state directory must match too.
Expected paths never come from the persisted bundle record. Both termination signals recheck this ownership.

Foreign or stale markers are forgotten without signaling the process they name. Cleanup removes only this
folder's derived Collector; state, secrets, config and port are retained. Fresh child-handle stop paths are unchanged.
`process-ownership.test.ts` covers detached harmless sentinels, misleading command arguments and metadata, long paths
with spaces, another actual wrangler, and logbooks sharing a config but using different state (ports 9160–9163).
