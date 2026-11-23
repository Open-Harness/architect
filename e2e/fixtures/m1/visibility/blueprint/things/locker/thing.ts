import { Blueprint } from "orthograph";
import { Organization } from "../organization/thing.ts";
import { owner } from "../organization/roles.ts";

// One thing with a field of each visibility: `label` is public (and traced), `note` is private to the organisation's owner, `code` is secret.
export const Locker = Blueprint.thing({
  description: "A locker an organisation keeps: its label is public, its note is for the owner, its code is secret.",
  fields: {
    id: Blueprint.id("lkr"),
    organization: Organization.fields.id,
    // Public text is untraced unless marked (O2): `traced` is what lets the label appear in spans and logs, so the control can see the capture work.
    label: Blueprint.traced(Blueprint.text({ max: 60 })),
    note: Blueprint.visibility.private(Blueprint.text({ max: 60 }), owner),
    code: Blueprint.visibility.secret(Blueprint.text({ max: 60 })),
    // A second secret, never issued to anyone: no output carries it, the caller's own answer included.
    seal: Blueprint.visibility.secret(Blueprint.text({ max: 60 })),
  },
});
