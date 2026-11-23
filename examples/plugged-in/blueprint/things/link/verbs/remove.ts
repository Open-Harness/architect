import { Blueprint } from "orthograph";
import { Link } from "../thing.ts";
import { linkOwner } from "../roles.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Link, {
  description: "Remove a link from a public page.",
  payload: { link: Link.fields.id },
  answer: {},
  move: machine.moves.remove,
  errors: [],
  allowed: [linkOwner],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
