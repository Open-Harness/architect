// M2.04: one secret of each kind frame/secrets.md defines, and both ways a runtime secret gets its value. The names come
// from the mount and the export: mounted as `organizations` they are ORGANIZATIONS_WEBHOOK_SIGNING and so on.
import { Blueprint, Secret } from "orthograph";

/** A runtime secret that is stored, with the test value a local environment uses unless one is set. */
export const webhookSigning = Blueprint.secret.stored({ describe: "The endpoint's signing secret", test: "whsec_fixture_test_value" });
/** A runtime secret that is stored and has no test value: it stays missing until a person sets it. */
export const signingKey = Blueprint.secret.stored({ describe: "The key that signs an invitation link" });
/** Mounted as `team`, this lands on the same name as another mount's export (the collision variants in e2e/m2). */
export const signingSecret = Blueprint.secret.generated({ bytes: 16 });
/** A release secret: CI's, never a running place's. */
export const publishToken = Blueprint.secret.stored({ kind: Secret.release, describe: "An npm automation token" });
/** A release secret that is generated, not stored: its kind is not decided by how it gets its value. */
export const releaseSeed = Blueprint.secret.generated({ kind: Secret.release, bytes: 16 });
/** A builder secret: the developer's machine's, never a running place's. */
export const queryToken = Blueprint.secret.stored({ kind: Secret.builder, describe: "A read-only telemetry query token" });
