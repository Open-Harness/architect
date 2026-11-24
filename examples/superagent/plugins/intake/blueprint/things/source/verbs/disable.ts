import { Blueprint } from "orthograph";
import { Source } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Source, {
  description: "Stop listening on a connection; its triggers already recorded stay.",
  payload: {
    source: Source.fields.id,
  },
  answer: {},
  move: machine.moves.disable,
  allowed: [Blueprint.signedIn],
});
