const NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
const RESERVED = new Set(["PATH", "HOME", "TMPDIR", "LANG"]);

/** A name a process could read as a variable and that the sandbox does not set itself. */
export const lendable = (name: string): boolean => NAME.test(name) && !name.startsWith("SUPERAGENT_") && !RESERVED.has(name);

/** `text` with each value replaced by `[redacted:<name>]`, the longest value first so one that holds another goes whole. */
export const redactor = (lent: ReadonlyArray<{ readonly name: string; readonly value: string }>) => {
  const byLength = lent.filter((l) => l.value !== "").sort((a, b) => b.value.length - a.value.length);
  return (text: string): string => byLength.reduce((out, l) => out.replaceAll(l.value, `[redacted:${l.name}]`), text);
};
