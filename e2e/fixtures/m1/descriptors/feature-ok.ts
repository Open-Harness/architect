// Positive: a feature descriptor, nested choices, a need with `when`, and a mount that uses every verb a feature has.
import { Blueprint, Via } from "orthograph";

const style = Blueprint.choice({ plain: "Repeats the text as it was given.", loud: "Repeats it in capitals." });
const signer = { node: Blueprint.choice({ local: "A key held here.", remote: "A key held elsewhere." }) };

export const echo = Blueprint.feature({ description: "Repeats what it is given.", choices: { style, signer }, needs: [] });

const mode = Blueprint.choice({ plain: "Greets once.", echoing: "Greets, and echoes the greeting." });
export const greet = Blueprint.feature({ description: "Greets by name.", choices: { mode }, needs: [echo, Blueprint.need(echo, { when: mode.echoing })] });

const Thing = Blueprint.thing({ description: "Something.", fields: { id: Blueprint.id("thg") } });
const shout = Blueprint.operation(Thing, { description: "Shout.", payload: {}, answer: {}, allowed: [Blueprint.anyone] });
const repeat = Blueprint.operation(Thing, { description: "Repeat.", payload: {}, answer: {}, allowed: [Blueprint.anyone] });

export const mount = Blueprint.use(echo, (p) => [
  p.choose(p.choices.style.loud),
  p.choose(p.choices.signer.node.remote),
  p.narrow(repeat, { via: [Via.session, Via.key] }),
  p.omit(shout),
]);
export const kind: "feature" = echo.kind;
