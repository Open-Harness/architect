// The build step: `node dist/main.js <file>` writes the stylesheet to <file>. The only place the package touches the file system.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { css } from "./index.ts";

const target = process.argv[2];
if (target === undefined) {
  process.stderr.write("usage: node dist/main.js <theme.css>\n");
  process.exit(2);
}
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, css);
