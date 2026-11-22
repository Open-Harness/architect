import { Blueprint } from "orthograph";
import { Email } from "../../values/people.ts";

// Lives as an actor, so its events are written in its own SQLite and must come home to the default journal before
// they reach anyone (M5-reach-out, Q1.4).
export const Ping = Blueprint.thing({
  description: "A ping to an address, kept in its own actor.",
  fields: { id: Blueprint.id("png"), to: Email },
  lives: "actor",
});
