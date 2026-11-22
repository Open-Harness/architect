// The break fixture of journey 7: a declared operation that is NOT `idempotent: "request"`, and workflows that `call` it
// (or not). Nothing in the example's own blueprint is unsafe; this is the only operation of its kind. Read by
// e2e/workflows/07-a-call-must-be-idempotent.test.ts.
import { Blueprint } from "orthograph";
import freeze from "../../blueprint/things/revision/verbs/freeze.ts";
import open from "../../blueprint/things/proposal/verbs/open.ts";
import link from "../../blueprint/things/revision/verbs/link.ts";
import { Revision } from "../../blueprint/things/revision/thing.ts";
import { ProposalOpened } from "../../blueprint/things/proposal/events.ts";
import { Digest } from "../../blueprint/values/words.ts";

/** Sent twice with one request it would freeze twice: no `idempotent`, so no request key can protect it. */
export const touch = Blueprint.operation(Revision, {
  description: "Touch a revision; not safe to repeat.",
  payload: { revision: Revision.fields.id },
  answer: { digest: Digest },
  allowed: [Blueprint.anyone],
});

const spec = (activities: Record<string, ReturnType<typeof Blueprint.activity.call>>) => ({
  description: "A workflow for the registration check.",
  starts: { revision: Revision.fields.id },
  activities,
});

/** The unsafe call is the first activity. */
export const firstIsUnsafe = Blueprint.workflow(spec({ freeze: Blueprint.activity.call(touch), propose: Blueprint.activity.call(open) }));
/** The unsafe call is the second activity, after safe ones, and an `await` and a timer that name no operation. */
export const laterIsUnsafe = Blueprint.workflow({
  description: "A workflow for the registration check.",
  starts: { revision: Revision.fields.id },
  activities: {
    freeze: Blueprint.activity.call(freeze),
    seen: Blueprint.activity.await(ProposalOpened, { within: "7 days" }),
    cooldown: Blueprint.activity.after("30 days"),
    link: Blueprint.activity.call(touch),
  },
});
/** Every call is safe; the same shapes of activity as `laterIsUnsafe`. */
export const allSafe = Blueprint.workflow({
  description: "A workflow for the registration check.",
  starts: { revision: Revision.fields.id },
  activities: {
    freeze: Blueprint.activity.call(freeze),
    seen: Blueprint.activity.await(ProposalOpened, { within: "7 days" }),
    cooldown: Blueprint.activity.after("30 days"),
    link: Blueprint.activity.call(link),
  },
});
