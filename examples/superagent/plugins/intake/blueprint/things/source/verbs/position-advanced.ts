import { Blueprint } from "orthograph";
import { Source } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Source, {
  description: "Record how far a connection has read, after a poll.",
  payload: { source: Source.fields.id, position: Source.fields.position },
  answer: {  },
  move: machine.moves.advance,
  allowed: [Blueprint.system],
});
