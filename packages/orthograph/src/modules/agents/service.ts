import type { AgentsApi } from "./types.ts";

export const Agents: AgentsApi = {
  agent: (spec) => Object.freeze({
    ...spec,
    kind: "agent",
    slots: spec.slots === undefined ? undefined : Object.freeze({ ...spec.slots }),
    ...(spec.tools === undefined ? {} : { tools: Object.freeze([...spec.tools]) }),
  }),
};
