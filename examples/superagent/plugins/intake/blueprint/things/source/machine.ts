import { Blueprint } from "orthograph";
import { Source } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Source, {
  states: ["setup", "ready", "paused", "error", "off"],
  moves: {
    save: { from: [], to: "setup", emits: Events.SourceSaved },
    enable: { from: ["setup", "paused", "off", "error"], to: "ready", emits: Events.SourceEnabled },
    disable: { from: ["setup", "ready", "paused", "error"], to: ["paused", "off"], emits: Events.SourceDisabled },
    advance: { from: ["ready"], to: "ready", emits: Events.SourcePositionAdvanced },
    fail: { from: ["ready"], to: "error", emits: Events.SourceFailed },
  },
  notFrom: { exit: 80 },
});
