import { Blueprint } from "orthograph";
import { Source } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Source, {
  description: "Start listening on a connection.",
  payload: { source: Source.fields.id },
  answer: {  },
  move: machine.moves.enable,
  allowed: [Blueprint.signedIn],
});
