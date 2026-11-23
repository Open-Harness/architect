import { Blueprint } from "orthograph";

/** How the echo is said. The first option is the default. */
export const style = Blueprint.choice({ plain: "Repeats the text as it was given.", loud: "Repeats it in capitals." });
