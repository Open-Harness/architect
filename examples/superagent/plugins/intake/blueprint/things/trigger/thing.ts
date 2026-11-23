import { Blueprint, Schema } from "orthograph";

export const Trigger = Blueprint.thing({
  description: "One event that came in from a connection. Never changed once stored.",
  fields: {
    id: Blueprint.id("trg"),
    superagent: Blueprint.id("sag"),
    source: Blueprint.text({ max: 60 }),
    event: Blueprint.text({ max: 200 }),
    thread: Blueprint.text({ max: 200 }),
    kind: Blueprint.text({ max: 40 }),
    text: Blueprint.text({ max: 65536 }),
    url: Blueprint.optional(Blueprint.text({ max: 500 })),
    author: Blueprint.optional(Blueprint.text({ max: 120 })),
    channel: Blueprint.value(Schema.Unknown),
  },
  code: "TR",
});
