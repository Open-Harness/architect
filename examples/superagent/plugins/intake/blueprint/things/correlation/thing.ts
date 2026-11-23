import { Blueprint } from "orthograph";

export const Correlation = Blueprint.thing({
  description: "A trigger seen on another thread: it adds context to a judgement and never routes.",
  fields: {
    id: Blueprint.id("cor"),
    superagent: Blueprint.id("sag"),
    trigger: Blueprint.id("trg"),
    thread: Blueprint.text({ max: 200 }),
  },
  code: "CO",
});
