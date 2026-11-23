// The tz database as the runtime knows it: `Intl` carries it, so no dependency is added. `UTC` is a zone but not always listed.
const known: ReadonlySet<string> = new Set([...Intl.supportedValuesOf("timeZone"), "UTC"]);

export const isZone = (name: string): boolean => known.has(name);
