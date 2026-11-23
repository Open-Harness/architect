import { Blueprint } from "orthograph";

export const Account = Blueprint.thing({
  description: "One account of an outside service, as a superagent has seen it, and whether its person is listed to ask.",
  fields: {
    id: Blueprint.id("acc"),
    superagent: Blueprint.id("sag"),
    source: Blueprint.text({ max: 60 }),
    external: Blueprint.text({ max: 120 }),
    login: Blueprint.text({ max: 120 }),
    bot: Blueprint.bool(),
  },
  code: "AC",
});
