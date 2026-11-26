import { existsSync, lstatSync, readdirSync } from "node:fs";

/** Why `dir` can't be filled, or nothing when it isn't there or is an empty folder. */
export const occupied = (dir: string, name: string): string | undefined => {
  if (!existsSync(dir)) return undefined;
  if (!lstatSync(dir).isDirectory()) return `${name} already exists and is a file: choose another name, or move it`;
  return readdirSync(dir).length > 0 ? `${name}/ is not empty: choose another name, or empty it` : undefined;
};
