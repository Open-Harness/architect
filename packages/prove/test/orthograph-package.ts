// `orthograph` is built into one folder of this repository (packages/orthograph/dist) and published from it. Test files run in
// parallel workers, and two of them (publish, staging) each put it on a registry of their own: a build that cleans `dist` while
// the other's `pnpm publish` is packing it leaves a tarball with no `dist` (exit 254, or an installed package that cannot load).
// So the build and the publish are one step taken under a lock every worker shares, and no test deletes `dist` afterwards.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Clock, Effect, Exit } from "effect";

const defaultLock = join(tmpdir(), "ortho-orthograph-package.lock");
/** Time comes from Effect's `Clock`, never `Date.now`. */
const now = () => Effect.runSync(Clock.currentTimeMillis);
/** Runs `f`; its value, or `undefined` when it failed. Failures here (a missing file, a lost rename) are expected outcomes, not errors. */
const attempt = <A>(f: () => A): A | undefined => {
  const exit = Effect.runSyncExit(Effect.try(f));
  return Exit.isSuccess(exit) ? exit.value : undefined;
};
/** Runs `f`; whether it went through. */
const works = (f: () => unknown) => Exit.isSuccess(Effect.runSyncExit(Effect.try(f)));
const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const alive = (pid: string) => spawnSync("kill", ["-0", pid], { timeout: 10_000 }).status === 0;
/**
 * The owner of a lock folder is the name of the one file in it, `owner-<pid>`: "" when the folder is gone, or has no such file (not
 * made whole, or its owner already claimed). One read, so a lock released meanwhile is no error. The owner is a file name, not
 * a file's contents, so that taking it over is a rename that only works while that owner still holds the lock.
 */
const ownerIn = (folder: string) => {
  const names = attempt(() => readdirSync(folder)) ?? [];
  return names.find((name) => /^owner-\d+$/.test(name))?.slice("owner-".length) ?? "";
};
/** A lock with no owner is from a crash between making it and writing the owner; it counts as abandoned once it is too old for a worker to be between those steps. */
const orphaned = (folder: string) => {
  const modified = attempt(() => statSync(folder).mtimeMs);
  return modified !== undefined && now() - modified > 30_000;
};
/** A name nobody else will pick, for the folder a lock is renamed to before it is deleted. */
const tombstone = (lock: string) => `${lock}.tomb-${process.pid}-${Math.random().toString(36).slice(2)}`;

/**
 * Takes a stale lock out of the way, atomically. The rename is of the dead owner's own file, `owner-<pid>`, and that name exists
 * only while that owner holds the lock: if the lock was reclaimed and taken by someone else meanwhile, the rename finds nothing
 * (ENOENT) and fails, so a live lock is never the one taken. It succeeds for exactly one process; the losers go back to acquiring.
 * The winner then owns the folder (a folder with a file in it cannot be renamed onto), renames it to a tombstone only it uses
 * and deletes that. Nothing is ever checked, then deleted, then created. Returns whether this process won.
 */
const claimStale = (lock: string) => {
  const seen = ownerIn(lock);
  if (seen === "" ? !orphaned(lock) : alive(seen)) return false;
  const tomb = tombstone(lock);
  const claimed = seen === ""
    ? works(() => renameSync(lock, tomb))
    : works(() => renameSync(join(lock, `owner-${seen}`), join(lock, `claimed-${process.pid}`))) && works(() => renameSync(lock, tomb));
  if (claimed) rmSync(tomb, { recursive: true, force: true });
  return claimed;
};

/**
 * The lock folder is made whole, owner file in it, and only then renamed to the lock's name. A rename onto a folder that has files
 * in it fails, so exactly one process takes the lock, and a lock never exists without the file that says whose it is.
 * Waits at most `waitMs`, then fails with a message that names the lock and its owner.
 */
const take = (lock: string, waitMs: number, pollMs: number) => {
  const mine = mkdtempSync(join(tmpdir(), "ortho-orthograph-package-"));
  writeFileSync(join(mine, `owner-${process.pid}`), "");
  const deadline = now() + waitMs;
  for (;;) {
    if (works(() => renameSync(mine, lock))) return;
    if (claimStale(lock)) continue;
    if (now() > deadline) {
      rmSync(mine, { recursive: true, force: true });
      return Effect.runSync(Effect.die(new Error(`gave up waiting ${waitMs} ms for the orthograph package lock ${lock} (held by pid ${ownerIn(lock) || "unknown"})`)));
    }
    pause(pollMs);
  }
};
/** Gives the lock up the way a stale one is taken: the owner file first (it is ours only while the lock is), then the folder. */
const release = (lock: string) => {
  const tomb = tombstone(lock);
  if (works(() => renameSync(join(lock, `owner-${process.pid}`), join(lock, "released"))) && works(() => renameSync(lock, tomb))) rmSync(tomb, { recursive: true, force: true });
};

export interface LockOptions { readonly lock?: string; readonly waitMs?: number; readonly pollMs?: number }
/** Runs `work` holding the lock every worker shares, and gives it up however `work` ends. */
export const withOrthographLock = <A>(work: () => A, options: LockOptions = {}): A => {
  const lock = options.lock ?? defaultLock;
  take(lock, options.waitMs ?? 20 * 60_000, options.pollMs ?? 250);
  try {
    return work();
  } finally {
    release(lock);
  }
};

/** Builds `orthograph` and publishes it to `registry`, alone; what each command printed and how it ended, for the test to assert. */
export const publishOrthograph = (repo: string, registry: string, env: Record<string, string | undefined>) =>
  withOrthographLock(() => {
    const built = spawnSync("pnpm", ["nx", "run", "orthograph:build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...env, NX_DAEMON: "false" }, timeout: 10 * 60_000 });
    const published = built.status === 0
      ? spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], { cwd: join(repo, "packages/orthograph"), encoding: "utf8", env, timeout: 5 * 60_000 })
      : undefined;
    return { built, published };
  });
