import { Blueprint, Schema } from "orthograph";

/** One input an agent was told: what was submitted, for which Assignment, and whether it began a turn or steered one. */
export const Told = Schema.Struct({
  requestId: Schema.String,
  text: Schema.String,
  assignment: Schema.NullOr(Schema.String),
  how: Schema.Literals(["submitted", "steered"]),
});

export const Agent = Blueprint.thing({
  description: "One agent: a durable conversation that lives in its own actor, told through the outbox and acting as itself.",
  fields: {
    id: Blueprint.id("agt"),
    kind: Blueprint.text({ max: 40 }),
    about: Blueprint.text({ max: 120 }),
    /** The Assignment it is working for: set by an opening tell; null once its turn ends or it is closed (an update that left it out would leave it as it was). */
    current: Blueprint.optional(Blueprint.value(Schema.NullOr(Schema.String))),
    /** The Assignments it was told to stop, newest last, the last few hundred (ids never repeat): an opening tell for one is refused, so a closed Assignment is never woken. */
    closed: Blueprint.optional(Blueprint.value(Schema.Array(Schema.String))),
    /** What it was told, newest last, the last few hundred: the record of each delivery (`requestId` is the delivering event's id), kept in the actor beside Pi's own conversation. */
    told: Blueprint.optional(Blueprint.value(Schema.Array(Told))),
  },
  lives: "actor",
  code: "AG",
});
