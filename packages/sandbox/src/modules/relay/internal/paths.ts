/** Every path a request names: `path`, `to`, `cwd`, and each watch target's `path`. The protocol sends them absolute. */
export const pathsOf = (request: Readonly<Record<string, unknown>>): ReadonlyArray<string> => {
  const found: Array<string> = [];
  for (const key of ["path", "to", "cwd"]) {
    const value = request[key];
    if (typeof value === "string") found.push(value);
  }
  const targets = request["targets"];
  if (Array.isArray(targets)) {
    for (const target of targets) {
      const path = typeof target === "object" && target !== null && "path" in target ? target.path : undefined;
      if (typeof path === "string") found.push(path);
    }
  }
  return found;
};

/** The same request with each path `map` gives a new spelling for: what the fence checked is what is sent on, never the raw string. */
export const mapPaths = (request: Readonly<Record<string, unknown>>, map: (path: string) => string): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...request };
  for (const key of ["path", "to", "cwd"]) if (typeof out[key] === "string") out[key] = map(out[key]);
  const targets = out["targets"];
  if (Array.isArray(targets)) out["targets"] = targets.map((t) => (typeof t === "object" && t !== null && typeof (t as { path?: unknown }).path === "string" ? { ...t, path: map((t as { path: string }).path) } : t));
  return out;
};

/** The words of an `exec`, `process` or `pty` request, for the record: its argv, or its shell string split on spaces. */
export const wordsOf = (request: Readonly<Record<string, unknown>>): ReadonlyArray<string> | undefined => {
  if (request["op"] !== "exec" && request["op"] !== "process" && request["op"] !== "pty") return undefined;
  const argv = request["argv"];
  if (Array.isArray(argv)) return argv.filter((word): word is string => typeof word === "string");
  const command = request["command"];
  return typeof command === "string" ? command.split(/\s+/).filter((word) => word !== "") : [];
};
