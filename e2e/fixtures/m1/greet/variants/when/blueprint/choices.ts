import { Blueprint } from "orthograph";

/** Whether the greeting is echoed. The first option is the default. */
export const mode = Blueprint.choice({ plain: "Greets once.", echoing: "Greets, and echoes the greeting." });
