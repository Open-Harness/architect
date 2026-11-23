// Visibility: the one rule for what leaves. Every output (an HTTP answer or refusal, the SDK, the CLI, MCP, spans, the
// journal, logs, the portal's data file) asks it, with the audience it is speaking to. A field the declaration does not name
// is never shown, whoever asks: the rule fails closed. (K12 section 1, ledger OPS-01.)
import type { FieldInput, FieldsInput, Role } from "orthograph";
import type { structOf } from "orthograph/server";

/**
 * Who is looking.
 * - `principal`: someone who called, with the roles they hold in this call. `issuing` is true only for the answer of the
 *   call that issued a secret, to that call's own caller: it is what lets an `issued` secret out, once.
 * - `agent`: an AI agent acting for a person (MCP), who holds the roles the person holds, and is never given a secret.
 * - `telemetry`: spans, logs and metrics, which a Collector keeps: public, traceable values only.
 * - `public`: anyone who can read the record (the journal, the docs): public values only.
 * - `owner`: whoever runs the deployment, reading its own record: public and private values, never a secret.
 */
export type Audience =
  | { readonly kind: "principal"; readonly held: ReadonlyArray<Role<any>>; readonly issuing: boolean }
  | { readonly kind: "agent"; readonly held: ReadonlyArray<Role<any>> }
  | { readonly kind: "telemetry" }
  | { readonly kind: "public" }
  | { readonly kind: "owner" };

export interface AudienceApi {
  /** A caller with the roles `held` in this call (none for the anonymous). `issuing` marks the answer that issued a secret. */
  readonly principal: (held?: ReadonlyArray<Role<any>>, options?: { readonly issuing?: boolean }) => Audience;
  /** An agent acting for a person who holds `held`. */
  readonly agent: (held?: ReadonlyArray<Role<any>>) => Audience;
  readonly telemetry: Audience;
  readonly public: Audience;
  readonly owner: Audience;
}

/** The fields of a list read's items: the thing's own, and `state`. */
export type ItemFields = FieldsInput;

export interface VisibilityApi {
  /**
   * Whether `audience` is shown a value declared as `field`. Public is shown to all (to telemetry only when traceable); a
   * private field to a principal or an agent who holds one of its roles, and to the owner; a secret to no one, except an
   * `issued` one to the principal whose call issued it.
   */
  readonly sees: (audience: Audience, field: FieldInput) => boolean;
  /**
   * `values` cut to what `audience` is shown: the keys the declaration `fields` names and that it sees, nothing else. A
   * list read's `items` are cut the same way by `items`. Never reads a key the declaration does not name.
   */
  readonly redact: (audience: Audience, fields: FieldsInput, values: object, items?: ItemFields) => Record<string, unknown>;
  /**
   * The struct schema of what a caller of this audience is answered with. A field it is always shown is required, one it
   * may be shown (private to roles, per call) is optional, one it is never shown is absent, and an undeclared one is not
   * named. The exception is a `principal`, whose schema is the wire's: it is what a client decodes of whatever a server
   * sent, so it names every declared field and makes the ones not always shown optional (`redact` is what cuts them).
   */
  readonly schema: <F extends FieldsInput>(audience: Audience, fields: F, items?: ItemFields) => ReturnType<typeof structOf<F>>;
  /** Some field is private to roles, so who holds which role matters to what is shown. */
  readonly needsRoles: (...groups: ReadonlyArray<FieldsInput>) => boolean;
}
