// Generated from the blueprint. Do not edit.
// The Worker a world runs: the production Worker, with the probes its packages answer (`/_world/probe/*`, `/_world/outbox`) registered. A deployed Worker's entry is main.ts.
import { probes as agentsProbes } from "@orthograph/agents/testing";
import worker, { registerProbes } from "./main.ts";

registerProbes({ ...agentsProbes });

export * from "./main.ts";
export default worker;
