import { Blueprint } from "orthograph";
import { Link } from "../thing.ts";
import { LinkNeedsHandle } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Link, {
  description: "Append a link to your own public page. You need a claimed name first.",
  payload: { title: Link.fields.title, url: Link.fields.url },
  answer: { link: Link.fields.id },
  move: machine.moves.add,
  errors: [LinkNeedsHandle],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
