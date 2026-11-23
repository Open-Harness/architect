// A problem found in a plugin's own files names its package path; it also names the mount that brought it in, so every
// message has both sides: the app's file and the package's (M1-plugins section 12).
import type { MountModel } from "../types.ts";

export const attributed = (problems: ReadonlyArray<string>, mounts: Readonly<Record<string, MountModel>>): ReadonlyArray<string> =>
  problems.map((p) => {
    const by = Object.values(mounts).filter((m) => p.includes(`${m.package}/`) && !p.includes(m.file));
    return by.length === 0 ? p : `${by.map((m) => m.file).join(", ")}: ${p}`;
  });
