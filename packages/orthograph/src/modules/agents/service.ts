import type { AgentsApi } from "./types.ts";
import { sealed } from "./internal/slots.ts";

export const Agents: AgentsApi = {
  agent: (spec) => Object.freeze({
    ...spec,
    kind: "agent",
    slots: sealed(spec.slots),
    ...(spec.tools === undefined ? {} : { tools: Object.freeze([...spec.tools]) }),
  }),
};
