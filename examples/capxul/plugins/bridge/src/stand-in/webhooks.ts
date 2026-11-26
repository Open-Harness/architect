// Scaffolded from ortho new adapter. Yours from now on.
// What Bridge's webhooks look like, so the stand-in can send them (apidocs.bridge.xyz, platform/additional-information/
// webhooks/structure and /signature): one envelope per event, signed with the endpoint's RSA key. A pure function of
// its inputs: the caller gives the clock, the ids and the signer.

export type Category = "kyc_link" | "customer" | "virtual_account.activity" | "transfer";

/** The envelope Bridge posts (its `WebhookEvent`): `event_id` is its once-per-event key, and `event_object` the resource as its API renders it. */
export interface Envelope {
  readonly api_version: "v0";
  readonly event_id: string;
  readonly event_developer_id: string;
  readonly event_sequence: number;
  readonly event_category: Category;
  readonly event_type: string;
  readonly event_object_id: string;
  readonly event_object_status: string | null;
  readonly event_object: Readonly<Record<string, unknown>> & { readonly id: string };
  readonly event_object_changes: Readonly<Record<string, unknown>>;
  readonly event_created_at: string;
}

export const envelope = (spec: {
  readonly id: string;
  readonly developer: string;
  readonly sequence: number;
  readonly category: Category;
  /** `created`, `updated` or `updated.status_transitioned`. */
  readonly mutation: string;
  readonly object: Envelope["event_object"];
  readonly status?: string;
  readonly changes?: Readonly<Record<string, unknown>>;
  readonly at: number;
}): Envelope => ({
  api_version: "v0",
  event_id: spec.id,
  event_developer_id: spec.developer,
  event_sequence: spec.sequence,
  event_category: spec.category,
  event_type: `${spec.category}.${spec.mutation}`,
  event_object_id: spec.object.id,
  event_object_status: spec.status ?? null,
  event_object: spec.object,
  event_object_changes: spec.changes ?? {},
  event_created_at: new Date(spec.at).toISOString(),
});

/**
 * Bridge's `X-Webhook-Signature`: `t=<milliseconds>,v0=<base64>`, the signature over SHA256(SHA256("<t>.<raw body>")),
 * RSA PKCS#1 v1.5 with the endpoint's key. `sign` is given the first digest and signs it with SHA-256 (which hashes it
 * again), as Bridge's own example verifies it. A receiver refuses one more than ten minutes old.
 */
export const signatureHeader = (body: string, at: number, sign: (digestOf: string) => string): string => `t=${at},v0=${sign(`${at}.${body}`)}`;

/**
 * The activity a deposit to a virtual account makes, in order (Bridge's `VirtualAccountEventType`): received, sent on
 * to Capxul's custody as USDC, processed. Each is its own event, with its own id, and all carry the deposit's
 * `deposit_id`, which is what makes them one deposit.
 */
export const depositActivity = (spec: {
  readonly ids: readonly [string, string, string];
  readonly depositId: string;
  readonly customer: string;
  readonly virtualAccount: string;
  readonly currency: string;
  /** Dollars, as Bridge writes them: `"1250.5"`. */
  readonly amount: string;
  readonly sender: string;
  readonly at: number;
}): ReadonlyArray<Envelope["event_object"]> =>
  (["funds_received", "payment_submitted", "payment_processed"] as const).map((type, i) => ({
    id: spec.ids[i]!,
    customer_id: spec.customer,
    virtual_account_id: spec.virtualAccount,
    type,
    amount: spec.amount,
    currency: spec.currency,
    developer_fee_amount: "0.0",
    exchange_fee_amount: "0.0",
    subtotal_amount: spec.amount,
    gas_fee: "0.0",
    deposit_id: spec.depositId,
    created_at: new Date(spec.at).toISOString(),
    source: { payment_rail: spec.currency === "eur" ? "sepa" : "ach_push", sender_name: spec.sender },
  }));
