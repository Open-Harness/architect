import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Task } from "../task/thing.ts";
import { Title, Body, Need, Options } from "../../values/coworker.ts";

// The Inbox item. An approval, a question and a request to join are one thing with a `need`.
// The old app holds this wait as a tool call parked inside Pi. Here the Ask holds it (K46 call 2), and the
// manager's conversation is free to carry on with other work.
export const Ask = Blueprint.thing({
  description: "Something waiting on a person: a decision, an approval, a review, a thing to do, or a thing to know.",
  fields: {
    id: Blueprint.id("ask"),
    workspace: Blueprint.id("org"),
    manager: Blueprint.optional(Manager.fields.id),
    about: Blueprint.optional(Task.fields.id),
    to: Blueprint.id("per"),
    need: Need,
    title: Title,
    shows: Body, // for approve: exactly what will be sent or done
    options: Options,
    recommends: Blueprint.optional(Blueprint.text({ max: 200 })),
    by: Blueprint.optional(Blueprint.todo("GAP dates: a deadline. `Blueprint.day()` is part-built by Capxul; an instant is not a value yet")),
    answer: Blueprint.optional(Body),
  },
  code: "AK",
});
