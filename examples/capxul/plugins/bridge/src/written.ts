// Scaffolded from ortho new adapter. Yours from now on.
// What Bridge's description doesn't say. Its description (latest.json) has no `webhooks` section, so the events Capxul
// listens to are written here from Bridge's webhook pages (apidocs.bridge.xyz, platform/additional-information/webhooks/
// structure): the whole envelope its endpoint receives, since only the envelope has the event's id, category and time.
// Each event object is what Bridge's API renders for that resource (its `IndividualKycLinkResponse`, `VirtualAccountEvent`
// and `TransferResponse`), kept to the fields Capxul reads; Bridge adds fields without notice, and they are let through.
import { Schema } from "effect";
import { Blueprint, Stand, type AdapterDoor } from "orthograph";

/** The envelope (Bridge's `WebhookEvent`): `event_id` is unique per event and the same on every retry of it. */
const envelope = <O extends Schema.Top>(category: string, object: O) =>
  Schema.Struct({
    api_version: Schema.Literal("v0"),
    event_id: Schema.String,
    event_developer_id: Schema.String,
    event_sequence: Schema.optionalKey(Schema.Number),
    event_category: Schema.Literal(category),
    event_type: Schema.String,
    event_object_id: Schema.String,
    event_object_status: Schema.optionalKey(Schema.NullOr(Schema.String)),
    event_object: object,
    event_object_changes: Schema.Unknown,
    event_created_at: Schema.String,
  });

/** A KYC link's status (`kyc_link.updated.status_transitioned`): what Bridge decided about a person's KYC or a business's KYB. */
const kycLinkObject = Schema.Struct({
  id: Schema.String,
  customer_id: Schema.String,
  type: Schema.Literals(["individual", "business"]),
  kyc_status: Schema.String,
  tos_status: Schema.optionalKey(Schema.String),
  rejection_reasons: Schema.optionalKey(Schema.Array(Schema.Struct({ reason: Schema.optionalKey(Schema.String), developer_reason: Schema.optionalKey(Schema.String) }))),
});

/** A virtual account's activity (`virtual_account.activity.created`): one step of a deposit, named by `type`, the deposit by `deposit_id`. */
const activityObject = Schema.Struct({
  id: Schema.String,
  customer_id: Schema.String,
  virtual_account_id: Schema.String,
  type: Schema.String,
  amount: Schema.String,
  currency: Schema.String,
  deposit_id: Schema.optionalKey(Schema.String),
  created_at: Schema.String,
  source: Schema.optionalKey(Schema.Struct({ payment_rail: Schema.optionalKey(Schema.String), sender_name: Schema.optionalKey(Schema.String) })),
});

/** A transfer's state (`transfer.updated.status_transitioned`), Bridge's `TransferState`. */
const transferObject = Schema.Struct({
  id: Schema.String,
  state: Schema.String,
  on_behalf_of: Schema.String,
  amount: Schema.String,
  currency: Schema.optionalKey(Schema.String),
  client_reference_id: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

type Envelope = { readonly event_id: string; readonly event_object: { readonly id: string } };

/**
 * One event is one `event_id`, however often Bridge retries it. Bridge names no person, only its own system, so the actor
 * is Bridge. A repeat is compared on the event's object.
 */
const identity = {
  id: (raw: unknown) => (raw as Envelope).event_id,
  actor: () => ({ id: "bridge", name: "Bridge", bot: true }),
  object: (raw: unknown) => (raw as Envelope).event_object,
};

export const events = {
  kycLink: Blueprint.incoming(envelope("kyc_link", kycLinkObject), identity),
  virtualAccountActivity: Blueprint.incoming(envelope("virtual_account.activity", activityObject), identity),
  transfer: Blueprint.incoming(envelope("transfer", transferObject), identity),
};

export const standIn = Stand.process("a small server that answers Bridge's API as Capxul's own Bridge account, with Lead Bank's and Modulr's deposit details, and sends its signed webhooks");

/**
 * Bridge signs each delivery in `X-Webhook-Signature: t=<ms>,v0=<base64>`: RSA PKCS#1 v1.5 with the endpoint's key, over
 * SHA256(SHA256("<t>.<raw body>")), and a receiver refuses one more than ten minutes old (apidocs.bridge.xyz,
 * webhooks/signature). `AdapterDoor` checks only an HMAC-SHA256 hex signature, so Bridge has no door until #995 (gap 5)
 * lets one verify an RSA signature against a public key.
 */
export const door: AdapterDoor | undefined = undefined;
