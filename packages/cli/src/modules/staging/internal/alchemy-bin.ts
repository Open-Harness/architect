// Where the Alchemy CLI's entry file is. Alchemy's `exports` map has no `./package.json` entry, only a `./*` pattern, so `import.meta.resolve("alchemy/package.json")` answers
// `lib/package.json.js`, a file that does not exist, and the folder above it is `lib`, not the package. This asks for the package's main entry instead (`lib/index.js`) and
// walks up to the folder that holds Alchemy's own `package.json`.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The package folder above `file`: the nearest parent that holds a `package.json`. */
export const packageDir = (file: string): string => {
  const up = dirname(file);
  return up === file || existsSync(join(up, "package.json")) ? up : packageDir(up);
};

export const alchemyBin = join(packageDir(fileURLToPath(import.meta.resolve("alchemy"))), "bin/cli.js");
