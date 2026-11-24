import { Blueprint, Schema } from "orthograph";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";

export const Superagent = Blueprint.thing({
  description: "One always-on agent, stored as data.",
  fields: {
    id: Blueprint.id("sag"),
    name: Blueprint.text({ max: 60 }),
    purpose: Blueprint.text({ max: 2000 }),
    connections: Blueprint.value(Schema.Array(Schema.Struct({ source: Schema.String, config: Schema.Unknown }))),
    playbook: Blueprint.value(Schema.Struct({ sandbox: Schema.String, prepare: Schema.optionalKey(Schema.String), skills: Schema.optionalKey(Schema.Array(Schema.String)), extraTools: Schema.optionalKey(Schema.Array(Schema.String)), model: Schema.optionalKey(Schema.String), endsWhen: Schema.Literals(["reported", "threadsClosed", "never"]) })),
    slots: Blueprint.uint(8),
    main: Agent.fields.id,
    pausedFrom: Blueprint.optional(Blueprint.oneOf(["observing", "live"])),
    pausedAt: Blueprint.optional(Blueprint.uint(64)),
    pausedFor: Blueprint.uint(64),
    passGen: Blueprint.uint(32),
  },
  code: "SU",
  versions: { key: "id" },
});
