import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";

export default Blueprint.operation(Superagent, {
  description: "The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost.",
  payload: {},
  answer: {
    armed: Blueprint.uint(32),
  },
  allowed: [Blueprint.system],
});
