import { Blueprint } from "orthograph";
import { Source } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Source, {
  description: "Save a connection: its kind and its configuration.",
  payload: {
    superagent: Source.fields.superagent,
    name: Source.fields.name,
    kind: Source.fields.kind,
    config: Source.fields.config,
  },
  answer: {
    source: Source.fields.id,
  },
  move: machine.moves.save,
  allowed: [Blueprint.signedIn],
});
