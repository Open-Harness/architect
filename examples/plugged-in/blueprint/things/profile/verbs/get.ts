import { Blueprint, Schema } from "orthograph";
import { Profile } from "../thing.ts";
import { ProfileNotFound } from "../errors.ts";
import { Handle } from "../../handle/thing.ts";
import { Link } from "../../link/thing.ts";

const PageLinks = Blueprint.value(Schema.Array(Schema.Struct({
  id: Link.fields.id.value.schema,
  title: Link.fields.title.value.schema,
  url: Link.fields.url.value.schema,
})));

export default Blueprint.operation(Profile, {
  description: "Read a claimed name's public page and its links in display order.",
  payload: { handle: Handle.fields.name },
  answer: { handle: Handle.fields.name, links: PageLinks },
  errors: [ProfileNotFound],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database({ writes: [] }) },
  budget: { p95: "150 millis" },
});
