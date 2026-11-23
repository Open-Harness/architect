import { Blueprint } from "orthograph";
import { Link } from "../thing.ts";
import { linkOwner } from "../roles.ts";
import { LinkAlreadyRemoved } from "../errors.ts";
import { LinkPosition } from "../../../values/page.ts";

export default Blueprint.operation(Link, {
  description: "Move a link to a zero-based position. A position past the end puts it last.",
  payload: { link: Link.fields.id, position: LinkPosition },
  answer: {},
  errors: [LinkAlreadyRemoved],
  allowed: [linkOwner],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
