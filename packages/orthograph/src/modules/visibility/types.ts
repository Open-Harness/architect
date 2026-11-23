// Visibility: who may see a field's value. `public` is the default, and the only visibility whose value may ever be a
// span attribute, a log line or a journal field (L2.P, N1 decision 3). A target that has no private state, such as
// Solidity, treats everything as public; one that has it, such as Noir on Aztec, uses the roles.
import type { Role } from "#modules/roles/types.js";
import type { Field } from "#modules/things/types.js";
import type { Value } from "#modules/values/types.js";

export interface PrivateTo {
  readonly kind: "private";
  /** The roles that may see it. Never empty. */
  readonly to: ReadonlyArray<Role<any>>;
}

/** `public`; `secret` (a password, token, key or session: nobody's, recorded nowhere); or private to some roles. */
export type Visibility = "public" | "secret" | PrivateTo;

export interface VisibilityApi {
  /** Allow a public text value or field to appear in traces. Preserves its visibility and schema. */
  readonly traced: <const X extends Value | Field>(x: X) => X;
  readonly visibility: {
    /**
     * Mark a value, or one field of a thing, as secret: `Blueprint.visibility.secret(Blueprint.text({ max: 128 }))`.
     * Gives back the same kind, so it goes wherever the original went.
     */
    readonly secret: <const X extends Value | Field>(x: X) => X;
    /** Private to a list of roles: `Blueprint.visibility.private(Balance, admin)`. */
    readonly private: <const X extends Value | Field>(x: X, ...roles: readonly [Role<any>, ...Array<Role<any>>]) => X;
    /** Public again: the default, said out loud. */
    readonly public: <const X extends Value | Field>(x: X) => X;
  };
  /**
   * Mark a secret answer value as handed to its caller once: `answer: { token: Blueprint.issued(Token) }`, where `Token`
   * is a secret value or a secret field. The answer of the call that issued it carries it, to that call's own caller, over
   * HTTP, the SDK and the CLI; it never leaves in a refusal, a read, MCP, telemetry, the journal or a generated file.
   * Gives back the same kind, so it goes wherever the original went. It is only a mark: the compiler refuses it on
   * anything but a secret value in an operation's answer.
   */
  readonly issued: <const X extends Value | Field>(x: X) => X;
}
