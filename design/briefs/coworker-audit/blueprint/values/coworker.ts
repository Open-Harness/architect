import { Blueprint, Schema } from "orthograph";

/** A short name a person reads. */
export const Title = Blueprint.value(Blueprint.text({ max: 200 }));
/** A few sentences. */
export const Note = Blueprint.value(Blueprint.text({ max: 4000 }));
/** Markdown a person or a manager writes: a mission page, a task's description. */
export const Body = Blueprint.value(Blueprint.text({ max: 65536 }));
/** What a manager, or a person, may do with one action: listed is on or ask, not listed is off. */
export const Mode = Blueprint.value(Schema.Literals(["on", "ask"]));
/** An action is an operation of this blueprint, by its path: `task.move`. Never a string table of its own. */
export const Action = Blueprint.value(Blueprint.text({ max: 120 }));
/** How a run says it is going. Only `ready`, `failed` and `dropped` end it. */
export const Report = Blueprint.value(Schema.Literals(["progress", "waiting", "ready", "blocked", "failed", "dropped"]));
/** What an ask needs from the person (model-next.md, "People"). */
export const Need = Blueprint.value(Schema.Literals(["decide", "approve", "do", "review", "know"]));
/** One option on an ask, as the question page shows it. */
export const Options = Blueprint.value(Schema.Array(Schema.Struct({
  label: Schema.String, next: Schema.String, risk: Schema.optional(Schema.String), cost: Schema.optional(Schema.String),
})));
/** A done-when line and whether it is met (model-next.md, "Work"). Not by whoever did the work. */
export const Checks = Blueprint.value(Schema.Array(Schema.Struct({ says: Schema.String, met: Schema.Boolean })));
