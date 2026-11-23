import { Channels } from "./channels.tsx";
import { Dx } from "./dx.tsx";
import { Fleet } from "./fleet.tsx";
import { Mission } from "./mission.tsx";
import { Plan } from "./plan.tsx";
import { ClaimOperation, ReleaseOperation } from "./rules-operations.tsx";
import { HandleThing, ProfileThing } from "./rules-things.tsx";
import { Worker } from "./worker.tsx";

export const pages: Record<string, { el: () => JSX.Element; title: string; height: number; app?: string }> = {
  Main: { el: Mission, title: "Goal", height: 1600 },
  Plan: { el: Plan, title: "Plan", height: 1560 },
  Fleet: { el: Fleet, title: "Fleet health", height: 1300 },
  Worker: { el: Worker, title: "Worker", height: 1700 },
  Channels: { el: Channels, title: "Channels", height: 1300 },
  RulesHandle: { el: HandleThing, title: "handle: Rules", height: 1640, app: "Orthograph portal" },
  RulesProfile: { el: ProfileThing, title: "profile: Rules", height: 880, app: "Orthograph portal" },
  RulesClaim: { el: ClaimOperation, title: "handle.claim: rules stop", height: 1540, app: "Orthograph portal" },
  RulesRelease: { el: ReleaseOperation, title: "handle.release: no rules stop", height: 1160, app: "Orthograph portal" },
  Dx: { el: Dx, title: "Developer view", height: 1900 },
};
