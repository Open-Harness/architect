// What the one sentence for a rule is made from: the same few facts the model carries for a rule, and the wire's copy of them.

/** The part of a rule its sentence reads. A model's rule, and the portal's wire copy of it, both fit. */
export interface RuleFacts {
  /** The states the rule holds in; absent or empty means every state. */
  readonly while?: ReadonlyArray<string> | undefined;
  /** The fields the rule keys on. */
  readonly fields: ReadonlyArray<string>;
  /** The rule's own words, which replace the generated sentence everywhere (G5, Q2). */
  readonly description?: string | undefined;
}
