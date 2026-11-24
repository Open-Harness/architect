import { Blueprint } from "orthograph";
import { Settings } from "./thing.ts";
import * as Events from "./events.ts";

// No pause of its own: the Superagent's `pause` and `resume` are the one switch (GOAL17-pause).
export const machine = Blueprint.machine(Settings, {
  states: ["current"],
  moves: {
    save: { from: [], to: "current", emits: Events.SettingsSaved },
  },
  notFrom: { exit: 40 },
});
