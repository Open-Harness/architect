import { Blueprint } from "orthograph";

export const Agent = Blueprint.thing({
  description: "One agent: a durable conversation that lives in its own actor, told through the outbox and acting as itself.",
  fields: {
    id: Blueprint.id("agt"),
    kind: Blueprint.text({ max: 40 }),
    about: Blueprint.text({ max: 120 }),
    current: Blueprint.optional(Blueprint.id("asg")),
  },
  lives: "actor",
  code: "AG",
});
