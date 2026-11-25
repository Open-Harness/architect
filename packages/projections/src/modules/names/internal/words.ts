// The small pieces of English the generated outputs share: an article that fits the word, a name as words, and what a flag says of its field.
import type { FieldModel, Model, OperationModel } from "@orthograph/compiler";
import { ruleSentence, words } from "orthograph/sentences";

// The sentence for a rule, and a name as words, are `orthograph`'s: the portal's browser client says them too, and a runtime package cannot import this one.
export { ruleSentence, words };

/** `a handle`, `an allowance`, `an hour`-less: by the first letter, which is right for every name a blueprint is likely to give. */
export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const refAny = (f: FieldModel) => f.value.type === "schema" && f.value.format === "ref-any";

/** What a text flag takes, in the words a caller uses: a wide number is a `uint` (kept as text, so no digit is lost), an id says what it names, a named value its own name. */
export const metavar = (f: FieldModel): string =>
  f.value.type === "uint" ? "uint" : f.value.type === "id" ? "id" : refAny(f) || f.json !== undefined ? "json" : f.named !== undefined ? words(f.named).replace(/ /g, "-") : "text";

/** What kind of value a field holds, as words. */
const kindOf = (f: FieldModel): string =>
  f.value.type === "uint" ? `a whole number below 2^${f.value.bits}`
  : f.value.type === "id" ? `an id (${f.value.prefix}_...)`
  : f.value.type === "text" ? `text of up to ${f.value.max} characters`
  : refAny(f) ? "a JSON object with the declaration and the id"
  : f.json === "list" ? "a list, as JSON"
  : f.json === "object" ? "an object, as JSON"
  : "text";

/**
 * A flag's help: the field's own description, then what kind of value it takes. With no description it still says what the flag is: the
 * thing field it is taken from, or the value's name, or the flag's own name, and the kind of value; never a bare "Text.".
 */
export const flagNote = (name: string, f: FieldModel): string => {
  if (f.description !== undefined) return `${f.description} ${sentence(kindOf(f))}.`;
  const of = f.ref !== undefined ? words(f.ref.replace(/\./g, " ")) : f.named !== undefined ? `${article(words(f.named))} ${words(f.named)}` : `the ${words(name)}`;
  return `${sentence(of)}: ${kindOf(f)}.`;
};

/**
 * The operation's description, then what its move does to the thing, in a sentence a person would write: a move that creates says what the
 * thing starts as, any other which states it goes from and to.
 */
export const helpOf = (op: OperationModel): string => {
  if (!op.move) return op.description;
  const to = op.move.to.join(" or ");
  return op.move.from.length === 0
    ? `${op.description} Creates ${article(op.thing)} ${words(op.thing)}, which starts ${to}.`
    : `${op.description} Moves ${article(op.thing)} ${words(op.thing)} from ${op.move.from.join(" or ")} to ${to}.`;
};

/**
 * The flag's declaration, as generated code: a number that fits is a number flag (handed on as digits); a wider one stays text. An any-thing
 * reference, a list or an object is parsed as JSON at the flag, so malformed JSON is refused there, naming the flag.
 */
export const flagCode = (name: string, f: FieldModel): string => {
  const note = `Flag.withDescription(${JSON.stringify(flagNote(name, f))})`;
  if (f.value.type === "uint" && f.value.bits <= 53) return `Flag.Int("${name}").pipe(Flag.map(String), ${note})`;
  const text = `Flag.String("${name}").pipe(Flag.withMetavar(${JSON.stringify(metavar(f))}), ${note})`;
  return refAny(f) || f.json !== undefined ? `${text}.pipe(Flag.withSchema(Schema.fromJsonString(Schema.Unknown)))` : text;
};

/** The rule behind one of an operation's refusals, by the model: its full name (`handle.oneHolderPerName`), the thing that holds it, and the sentence every output says. */
export interface RuleBehind {
  readonly full: string;
  readonly thing: string;
  readonly name: string;
  readonly sentence: string;
  /** The fields the rule keys on, which the refusal carries by place. */
  readonly fields: ReadonlyArray<string>;
}

/** The rule an operation's refusal is made for (`op.invariants`), or undefined when the runtime refuses it for another reason. */
export const ruleBehind = (model: Model, op: OperationModel, refusal: string): RuleBehind | undefined => {
  const full = op.invariants?.[refusal];
  if (full === undefined) return undefined;
  const at = full.lastIndexOf(".");
  const thing = full.slice(0, at);
  const name = full.slice(at + 1);
  const rule = model.things[thing]?.invariants?.[name];
  return rule === undefined ? undefined : { full, thing, name, sentence: ruleSentence(thing, rule), fields: rule.fields };
};
