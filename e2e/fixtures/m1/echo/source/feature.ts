// The descriptor: pure metadata, imported by the mount and by the compiler. No runtime entry is imported here.
import { Blueprint } from "orthograph";
import * as choices from "./blueprint/choices.js";

export default Blueprint.feature({
  description: "Repeats what it is given.",
  choices,
  needs: [],
});
