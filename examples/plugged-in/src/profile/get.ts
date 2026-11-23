// Scaffolded from blueprint/things/profile/verbs/get.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/profile/get.handler.ts";
import { Link } from "../../blueprint/things/link/thing.ts";
import { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";
import { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";

const { ProfileNotFound } = Errors.declared;

/**
 * profile.get: Read a claimed name's public page and its links in display order.
 *
 * Who may call, from blueprint/things/profile/verbs/get.ts:
 *   anyone
 *
 * Payload, from blueprint/things/profile/verbs/get.ts:
 *   handle  handle.name
 *
 * Answer, from blueprint/things/profile/verbs/get.ts:
 *   handle  handle.name
 *   links   schema
 *
 * Refusals:
 *   ProfileNotFound  exit 20  PR-001  yours to refuse below; from blueprint/things/profile/errors.ts
 *
 * Budget, from blueprint/things/profile/verbs/get.ts: p95 150ms.
 *
 * What the runtime does, so this handler doesn't:
 *   each step is its own span: profile.get.load;
 *   the call is the span profile.get, and its commit profile.get.commit.
 */
const get: Handler = ({ handle }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const held = yield* steps.load(records.findBy(oneHolderPerName, handle));

    // ProfileNotFound: exit 20, PR-001. An unclaimed or released name has no public page.
    if (!held) {
      yield* Effect.logInfo("no claimed handle holds this name, so it has no page");
      return yield* new ProfileNotFound({});
    }

    const page = yield* steps.load(records.findBy(onePagePerHandle, held["id"] as never));
    const ids = ((page?.["links"] ?? []) as ReadonlyArray<string>);
    const found = yield* steps.load(Effect.forEach(ids, (link) => records.find(Link, link as never)));
    const links = found.flatMap((link) => (link ? [{ id: link["id"] as never, title: link["title"] as never, url: link["url"] as never }] : []));

    return { handle, links };
  });

export default get;
