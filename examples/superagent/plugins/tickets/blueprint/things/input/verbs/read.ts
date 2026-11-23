import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";

export default Blueprint.operation(Input, {
  description: "Read one Input's text.",
  payload: {
    input: Input.fields.id,
  },
  answer: {
    text: Input.fields.text,
  },
  allowed: [Blueprint.system],
});
