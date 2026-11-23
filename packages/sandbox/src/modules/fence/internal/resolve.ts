import { basename, dirname, join, sep } from "node:path";
import { Effect } from "effect";
import type { Disk } from "../../disk/types.ts";

/** Case-folded, as the rule says: a differently cased path on a case-insensitive disk is the same place. */
export const fold = (path: string): string => path.toLowerCase();

/** What a path stands for when nothing resolves a link for us. */
export const UNRESOLVABLE = "(a symbolic link that does not resolve)";

/**
 * Where `absolute` really lands: its nearest existing parent's real path, with the missing tail put back on. A symbolic link that
 * cannot be resolved (dangling, or a loop) is not "missing": a write through it would create what it points at, so it lands
 * nowhere we can vouch for and the answer is `UNRESOLVABLE`.
 */
export const landing = (disk: Disk, absolute: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    const real = yield* disk.realpath(absolute);
    if (real !== null) return real;
    if (yield* disk.isLink(absolute)) return UNRESOLVABLE;
    const parent = dirname(absolute);
    if (parent === absolute) return absolute;
    const above = yield* landing(disk, parent);
    return above === UNRESOLVABLE ? above : join(above, basename(absolute));
  });

export const isUnder = (path: string, root: string): boolean => {
  if (path === UNRESOLVABLE) return false;
  const [p, r] = [fold(path), fold(root)];
  return p === r || p.startsWith(r.endsWith(sep) ? r : r + sep);
};
