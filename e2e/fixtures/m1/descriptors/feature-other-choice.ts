import { Blueprint } from "orthograph";

const mine = Blueprint.choice({ plain: "One way.", loud: "Another." });
const theirs = Blueprint.choice({ left: "One side.", right: "The other." });
export const first = Blueprint.feature({ description: "The first.", choices: { mine }, needs: [] });
export const second = Blueprint.feature({ description: "The second.", choices: { theirs }, needs: [] });

// @ts-expect-error an option of another plugin's choice is not one of the first's
export const bad = Blueprint.use(first, (p) => [p.choose(theirs.left)]);
