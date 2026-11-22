import { Blueprint } from "orthograph";
import freeze from "../things/revision/verbs/freeze.ts";
import link from "../things/revision/verbs/link.ts";
import withdraw from "../things/revision/verbs/withdraw.ts";
import open from "../things/proposal/verbs/open.ts";
import { Revision } from "../things/revision/thing.ts";
import { ProposalOpened } from "../things/proposal/events.ts";

export default Blueprint.workflow({
  description: "Put a frozen revision to the vote, wait for it to be opened and a cooldown, then link it back.",
  starts: { revision: Revision.fields.id }, // the run's key: starting twice with the same fields is one run
  activities: {
    freeze: Blueprint.activity.call(freeze),
    propose: Blueprint.activity.call(open),
    seen: Blueprint.activity.await(ProposalOpened, { within: "7 days" }),
    cooldown: Blueprint.activity.after("30 days"),
    link: Blueprint.activity.call(link),
    withdraw: Blueprint.activity.call(withdraw), // no proposal was opened in time: the revision goes back
  },
});
