import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";
import { machine } from "./machine.ts";

/** The one switch (GOAL17-pause): while a superagent is paused, what the app lists as held waits where it already waits. */
export const processing = Blueprint.hold(Superagent, { key: Superagent.fields.id, while: [machine.states.paused] });
