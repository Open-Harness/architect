import { Blueprint } from "orthograph";
import echo from "@fixture/echo";

export default Blueprint.feature({
  description: "Greets by name, and needs the echo beside it.",
  choices: {},
  needs: [echo],
});
