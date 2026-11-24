import { Blueprint } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Correlation = Blueprint.thing({
  description: "A trigger seen on another thread: it adds context to a judgement and never routes.",
  fields: {
    id: Blueprint.id("cor"),
    superagent: Superagent.fields.id,
    trigger: Blueprint.id("trg"),
    thread: Blueprint.text({ max: 200 }),
  },
  code: "CO",
});
