// Throwaway: `@orthograph/agents/probes`, the descriptors of GOAL17-check-harness calls 1 and 5, as the record writes them.
const read = (route: string) => (args: unknown) => ({ kind: "world-call" as const, route, method: "GET" as const, args });
export const calls = read("probe/agent/calls");
export const told = read("probe/agent/told");
