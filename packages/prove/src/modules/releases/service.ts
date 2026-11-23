import { Names } from "orthograph/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect, Redacted } from "effect";
import { Compare, canonical } from "@orthograph/compiler";
import { Environments } from "#modules/environments/service.js";
import { Verdicts } from "#modules/verdicts/service.js";
import type { TokenSource } from "#modules/verdicts/types.js";
import { ReleaseFailed, type Env as ReleaseEnv, type ReleasesApi, type Shipping } from "./types.ts";
import { call, ok } from "./internal/http.ts";
import { modelAt, staleness } from "./internal/stale.ts";

/** The last production release's version and revision, or undefined when there has been none. */
const lastRelease = (logbook: string) =>
  call("GET", `${logbook}/releases/latest`).pipe(
    Effect.flatMap((a) => {
      if (a.status === 404) return Effect.succeed(undefined);
      return ok("the last release", a).pipe(Effect.map((body) => body as { readonly version: string; readonly revision: string }));
    }),
  );

const shipping: ReleasesApi["shipping"] = (logbook, model, root) =>
  Effect.gen(function* () {
    const last = yield* lastRelease(logbook);
    const { stale, proven } = yield* staleness(logbook, model, root);
    if (last === undefined) return { from: null, version: "1.0.0", bump: null, changes: [], proven, stale } satisfies Shipping;
    const released = Compare.release(yield* modelAt(logbook, last.revision), model);
    const version = Compare.next(last.version, released.bump);
    if (version === undefined) return yield* new ReleaseFailed({ message: `the last release's version is not x.y.z: ${last.version}` });
    return { from: last.version, version, bump: released.bump, changes: released.changes, proven, stale } satisfies Shipping;
  });

const changesJson: ReleasesApi["changesJson"] = (s) =>
  JSON.stringify({ from: s.from, to: s.version, changes: s.changes, stale: s.stale.map((x) => x.operation), proven: s.proven }, null, 2) + "\n";

/** The same token source as a verdict's: one place decides it (D3 #90). Minted per write, because the issuer's tokens are short-lived. */
const writeToken = (env: ReleaseEnv) =>
  Verdicts.sourceOf(env).pipe(
    Effect.flatMap(Verdicts.mint),
    Effect.map(Redacted.value),
    Effect.mapError((e) => new ReleaseFailed({ message: e.message })),
  );

/** A token from a source already chosen (a prove's own), minted for this write. */
const tokenFrom = (source: TokenSource) =>
  Verdicts.mint(source).pipe(Effect.map(Redacted.value), Effect.mapError((e) => new ReleaseFailed({ message: e.message })));

export const Releases: ReleasesApi = {
  locate: ({ root, env }) => {
    const given = env[Names.variable("LOGBOOK_URL")];
    if (given) return Effect.succeed(given.replace(/\/+$/, ""));
    return Environments.status({ root, name: "logbook" }).pipe(
      Effect.map((s) => (s.state === "up" ? s.url : undefined)),
      Effect.mapError((e) => new ReleaseFailed({ message: e.message })),
    );
  },
  last: (logbook) => lastRelease(logbook),
  shipping,
  next: (logbook, model) => Effect.map(shipping(logbook, model), (s) => s.version),
  keep: ({ logbook, env, source, model, revision }) =>
    Effect.gen(function* () {
      const token = yield* (source === undefined ? writeToken(env ?? {}) : tokenFrom(source));
      const put = yield* call("PUT", `${logbook}/models/${encodeURIComponent(revision)}`, { token, body: canonical(model) });
      yield* ok(`the model of ${revision}`, put);
    }),
  record: ({ logbook, env, model, revision, version }) =>
    Effect.gen(function* () {
      yield* Releases.keep({ logbook, env, model, revision });
      const posted = yield* call("POST", `${logbook}/releases`, { token: yield* writeToken(env), body: JSON.stringify({ version, revision }) });
      yield* ok(`release ${version}`, posted);
    }),
  changesJson,
  writeChanges: (root, s) =>
    Effect.sync(() => {
      const path = join(root, "generated/model/changes.json");
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, changesJson(s));
    }),
};
