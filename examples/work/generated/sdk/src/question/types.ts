// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/question/thing.ts";
import type * as Events from "../../../../blueprint/things/question/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a question moves between, as its machine declares them. */
export type QuestionState = "asked" | "answered" | "spiked";

/** Something the manager needs you to decide before the mission starts, taken from a gap in the blueprint. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Question = {
  readonly "id": Of<Declared["id"]>;
  readonly "mission": Of<Declared["mission"]>;
  readonly "asks": Of<Declared["asks"]>;
  readonly "about": Of<Declared["about"]>;
  readonly "gap": Of<Declared["gap"]>;
  readonly "options": Of<Declared["options"]>;
  readonly "state": QuestionState;
};

/** The event QuestionAnswered: what it carries when a question moves. */
export type QuestionAnswered = {
  readonly "question": Of<(typeof Events)["QuestionAnswered"]["fields"]["question"]>;
  readonly "picked": Of<(typeof Events)["QuestionAnswered"]["fields"]["picked"]>;
};

/** The event QuestionAsked: what it carries when a question moves. */
export type QuestionAsked = {
  readonly "question": Of<(typeof Events)["QuestionAsked"]["fields"]["question"]>;
  readonly "mission": Of<(typeof Events)["QuestionAsked"]["fields"]["mission"]>;
  readonly "asks": Of<(typeof Events)["QuestionAsked"]["fields"]["asks"]>;
  readonly "about": Of<(typeof Events)["QuestionAsked"]["fields"]["about"]>;
  readonly "options": Of<(typeof Events)["QuestionAsked"]["fields"]["options"]>;
};

/** The event QuestionSpiked: what it carries when a question moves. */
export type QuestionSpiked = {
  readonly "question": Of<(typeof Events)["QuestionSpiked"]["fields"]["question"]>;
  readonly "about": Of<(typeof Events)["QuestionSpiked"]["fields"]["about"]>;
};
