// What an adapter's door and its events say about who sent them (Goal 17 slice 11, GOAL17-slice11-build).
import type { Secret } from "#modules/secrets/types.js";

/** An outside account as an event names it: the service's stable id, a name for people, and whether it is a bot. */
export interface EventActor {
  readonly id: string;
  readonly name: string;
  readonly bot: boolean;
}

/**
 * How an adapter's door receives a delivery (M5-reach-out Q2, built in Goal 17 slice 11): how its sender signs, where the event's
 * name is, and the one request that is a handshake. Pure data, so the compiler can read it and the Worker can run it. The
 * signing secret is the adapter's own `webhookSigning`; its name in an environment is `<MOUNT>_WEBHOOK_SIGNING`.
 */
export interface AdapterDoor {
  readonly signing: Secret;
  readonly verify: {
    /** The header holding the signature: `prefix` then HMAC-SHA256 in lowercase hex. */
    readonly header: string;
    readonly prefix: string;
    /** What is signed: the raw bytes of the body, or `<version>:<timestamp>:<body>` (Slack's v0). */
    readonly signs: "body" | { readonly version: string };
    /** A request signed more than `within` seconds from the door's clock, either way, is refused. Needed when `signs` has a timestamp. */
    readonly timestamp?: { readonly header: string; readonly within: number };
  };
  /** Where the event's name is, as the sender writes it (`issue_comment`); the adapter's name for it is the camel case (`issueComment`). */
  readonly event: { readonly header: string } | { readonly path: ReadonlyArray<string> };
  /** Top-level parts of the body that say who delivered it, not what it says (GitHub's `installation`): left out when the event is judged, kept in what is stored. */
  readonly envelope?: ReadonlyArray<string>;
  /** A signed request whose body has `field` equal to `is` is answered with the body's `answer` and written nowhere (Slack's url_verification). */
  readonly challenge?: { readonly field: string; readonly is: string; readonly answer: string };
}

