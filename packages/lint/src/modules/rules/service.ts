import type { Plugin } from "./types.ts";
import { noNameAsString } from "./internal/names.ts";
import { declaredErrorsOnly, refusalHasLog } from "./internal/refusals.ts";
import { handlerMatchesPath, noWallClock } from "./internal/place.ts";
import { noViemOutsideChain } from "./internal/viem.ts";
import { noProOutsidePortalUi } from "./internal/pro.ts";
import { noUiInWorker } from "./internal/ui.ts";
import { noOldNames } from "./internal/old-names.ts";
import { requiredStepUsed } from "./internal/steps.ts";
import { declaredErrorNamed, outcomeChosen } from "./internal/drift.ts";
import { effectOnly } from "./internal/effect-only.ts";
import { maxLines } from "./internal/max-lines.ts";
import { sixSlots } from "./internal/six-slots.ts";

/** The oxlint plugin. `ortho check` registers it by path and passes every rule the same `ProjectFacts`. */
export const plugin: Plugin = {
  meta: { name: "ortho" },
  rules: {
    "no-name-as-string": noNameAsString,
    "refusal-has-log": refusalHasLog,
    "declared-errors-only": declaredErrorsOnly,
    "no-wall-clock": noWallClock,
    "handler-matches-path": handlerMatchesPath,
    "no-old-names": noOldNames,
    "required-step-used": requiredStepUsed,
    "outcome-chosen": outcomeChosen,
    "declared-error-named": declaredErrorNamed,
    "no-viem-outside-chain": noViemOutsideChain,
    "no-pro-outside-portal-ui": noProOutsidePortalUi,
    "no-ui-in-worker": noUiInWorker,
    // The repository's own code rules (AGENTS.md), each with a baseline of the breaches it tolerates.
    "effect-only": effectOnly,
    "max-lines": maxLines,
    "six-slots": sixSlots,
  },
};
