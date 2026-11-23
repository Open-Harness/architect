// The feature's own journey. It runs on every prove of an app that mounts the feature, so it must hold for every option
// the feature offers: it asserts what is true of both styles, and names no span (spans follow the mount's names).
import { Blueprint, expect, noEvents, type Allowed, type Journey } from "orthograph";
import repeat from "../things/echo/verbs/repeat.js";
import shout from "../things/echo/verbs/shout.js";

const visitor: Allowed = Blueprint.anyone;

// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly visitor: Allowed }> = Blueprint.journey("echo repeats and shouts", {
  cast: { visitor },
  steps: (s) => [
    s.step("repeat says the text back", s.visitor.run(repeat, { text: "hello" }), expect((answer) => answer.text.toLowerCase()).toBe("hello"), noEvents()),
    s.step("shout says it louder", s.visitor.run(shout, { text: "hello" }), expect((answer) => answer.text).toMatch(/^HELLO!+$/), noEvents()),
  ],
});

export default journey;
