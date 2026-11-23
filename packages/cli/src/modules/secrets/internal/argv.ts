// A secret's value on the command line is seen by `ps` and kept in shell history, so `secrets set` takes none: the arguments
// of `ortho secrets set` are the name, `--env` and `--root`, and anything else is refused here, before the parser can
// quote it back in an error message.
const OWN = new Set(["--env", "--root"]);

/** Whether `args` (everything after `ortho`) is a `secrets set` with something on its command line besides NAME, --env and --root. */
export const carriesValue = (args: ReadonlyArray<string>): boolean => {
  const at = args.findIndex((a, i) => a === "secrets" && args[i + 1] === "set");
  if (at < 0) return false;
  let positionals = 0;
  const rest = args.slice(at + 2);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (OWN.has(arg)) { i++; continue; }
    if (arg.startsWith("--env=") || arg.startsWith("--root=")) continue;
    if (arg.startsWith("-")) return true;
    positionals++;
  }
  return positionals > 1;
};

export const VALUE_REFUSED = "a secret's value is read from stdin, never given on the command line: printf %s \"$VALUE\" | ortho secrets set <NAME> [--env <name>]\n";
