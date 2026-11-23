import { Blueprint } from "orthograph";
import echo from "@fixture/echo";
import * as choices from "./blueprint/choices.js";

// The need on echo applies only when the mount picks `echoing`.
export default Blueprint.feature({
  description: "Greets by name; echoing its greeting needs the echo beside it.",
  choices,
  needs: [Blueprint.need(echo, { when: choices.mode.echoing })],
});
