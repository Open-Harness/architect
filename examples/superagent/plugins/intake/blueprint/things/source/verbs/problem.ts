import { Blueprint } from "orthograph";
import { Source } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Source, {
  description: "Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds.",
  payload: {
    source: Source.fields.id,
  },
  answer: {},
  move: machine.moves.fail,
  allowed: [Blueprint.system],
});
