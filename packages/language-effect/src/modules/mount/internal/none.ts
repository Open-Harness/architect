// No mount at all: nothing chosen, so every choice is at its first option.
import type { Mount } from "orthograph";

export const noMount: Pick<Mount, "verbs"> = { verbs: [] };
