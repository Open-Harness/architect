import type { ModelConfig } from "../types.ts";

const text = (env: Readonly<Record<string, unknown>>, name: string): string | undefined => {
  const value = env[name];
  return typeof value === "string" && value !== "" ? value : undefined;
};

/**
 * The model endpoint from the environment. A world's stand-in address reaches the Worker as `ORTHO_STAND_MODELS` (the mount's name, upper-cased); a real
 * environment says `MODELS_BASE_URL`. Each kind's model is `MODEL_<KIND>`, and without one it is the kind's own name, which the scripted stand-in matches.
 */
export const configOf = (env: Readonly<Record<string, unknown>>): ModelConfig | undefined => {
  const stand = text(env, "ORTHO_STAND_MODELS");
  const base = text(env, "MODELS_BASE_URL") ?? (stand === undefined ? undefined : `${stand}/v1`);
  if (base === undefined) return undefined;
  return { baseUrl: base, apiKey: text(env, "MODELS_API_KEY"), modelFor: (kind) => text(env, `MODEL_${kind.toUpperCase()}`) ?? kind };
};
