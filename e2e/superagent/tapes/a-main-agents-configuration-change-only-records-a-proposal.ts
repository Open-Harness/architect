import { PolicyChanged } from "@orthograph/intake/blueprint/things/policy/events.ts";
import { ProposalRecorded } from "../kit/ops.ts";
import { WORLD } from "../tape/tapekit.ts";

const ops = ["superagent.update", "policy.save", "policy.sync", "account.list", "settings.save"];
const waiting = (names: ReadonlyArray<string>) => ({ items: names.map((operation) => ({ operation, changes: { slots: 9 }, why: "the pool is too small" })), next: null });
export default {
  world: WORLD,
  steps: { "#2": { answer: { revision: 2n } }, "#7": { answer: waiting(ops) }, "#8": { answer: { revision: 1n } }, "#9": { answer: { revision: 1n } } },
  plants: [
    { name: "the main agent's change was applied, so ann's save from the same base is one revision on", step: "#2", with: () => ({ answer: { revision: 3n } }) },
    { name: "the main agent's update was applied instead of recorded", step: "#1", with: () => ({ events: [] }) },
    { name: "the policy change was applied instead of recorded", step: "#3", with: () => ({ events: [] }) },
    { name: "the sync was applied instead of recorded", step: "#4", with: () => ({ events: [] }) },
    { name: "the listing was applied instead of recorded", step: "#5", with: () => ({ events: [] }) },
    { name: "the settings change was applied instead of recorded", step: "#6", with: () => ({ events: [] }) },
    { name: "one proposal is missing", step: "#7", with: () => ({ answer: waiting(ops.slice(0, 4)) }) },
    { name: "a sixth proposal nobody made", step: "#7", with: () => ({ answer: waiting([...ops, "prompts.save"]) }) },
    { name: "the same proposal twice", step: "#7", with: () => ({ answer: waiting([...ops, "settings.save"]) }) },
    { name: "the proposals are out of the order they were made in", step: "#7", with: () => ({ answer: waiting([...ops].reverse()) }) },
    { name: "REVIEW: the proposals record what nobody asked for (an empty allowed list, no slots)", step: "#7", with: () => ({ answer: { items: ops.map((operation) => ({ operation, payload: {} })), next: null } }) },
    { name: "the main agent's policy change was applied: ann's save from the first base is stale", step: "#8", with: () => ({ answer: { revision: 2n } }) },
    { name: "the main agent's settings change was applied: ann's save from the first base is stale", step: "#9", with: () => ({ answer: { revision: 2n } }) },
    { name: "a proposal records no reason", step: "#7", with: () => ({ answer: { items: ops.map((operation) => ({ operation, changes: { slots: 9 }, why: "" })), next: null } }) },
  ],
};
