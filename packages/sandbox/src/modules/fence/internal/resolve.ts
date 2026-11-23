import { basename, dirname, join, sep } from "node:path";
import { Effect } from "effect";
import type { Disk } from "../../disk/types.ts";

/** Case-folded, as the rule says: a differently cased path on a case-insensitive disk is the same place. */
export const fold = (path: string): string => path.toLowerCase();

/** Where `absolute` really lands: its nearest existing parent's real path, with the missing tail put back on. */
export const landing = (disk: Disk, absolute: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    const real = yield* disk.realpath(absolute);
    if (real !== null) return real;
    const parent = dirname(absolute);
    if (parent === absolute) return absolute;
    return join(yield* landing(disk, parent), basename(absolute));
  });

export const isUnder = (path: string, root: string): boolean => {
  const [p, r] = [fold(path), fold(root)];
  return p === r || p.startsWith(r.endsWith(sep) ? r : r + sep);
};
