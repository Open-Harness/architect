import { join } from "node:path";

/** A program name: letters, digits and `._+-`, no slash, no space. */
export const PROGRAM = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

export const hitsFile = (shims: string): string => join(shims, ".hits");

export const refusalText = (name: string): string => `BlockedCommand: ${name}`;

/** One shim: logs its name, prints the refusal on stderr, exits 126 ("found but cannot run"). Names are checked against PROGRAM first, so quoting is safe. */
export const shimScript = (name: string, hits: string): string =>
  `#!/bin/sh\nprintf '%s\\n' '${name}' >> '${hits.replaceAll("'", "'\\''")}'\nprintf '%s\\n' '${refusalText(name)}' >&2\nexit 126\n`;
