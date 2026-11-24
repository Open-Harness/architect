// Slice 8, a kill and a restart (GOAL17-check-harness call 2): a kill mid-turn resumes with no second committed model call; a kill mid-push leaves one
// branch update and one pull request; a failed send is retried after a restart. Red until slice 9 builds the runner, the stand-ins' controls and the agents.
import { journeysPass } from "./agents-support.ts";

journeysPass("a kill and a restart", ["a-kill-mid-turn-resumes-with-no-second-model-call", "a-kill-mid-push-leaves-one-branch-update-and-one-pull-request", "a-failed-send-is-retried-after-a-restart"]);
