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

/** The words of an `exec`, `process` or `pty` request, for the record: its argv, or its shell string split on spaces. */
export const wordsOf = (request: Readonly<Record<string, unknown>>): ReadonlyArray<string> | undefined => {
  if (request["op"] !== "exec" && request["op"] !== "process" && request["op"] !== "pty") return undefined;
  const argv = request["argv"];
  if (Array.isArray(argv)) return argv.filter((word): word is string => typeof word === "string");
  const command = request["command"];
  return typeof command === "string" ? command.split(/\s+/).filter((word) => word !== "") : [];
};
