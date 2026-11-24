// The models a conversation runs on: one OpenAI-compatible endpoint (GOAL17-model-endpoint), a model per agent kind, each request naming the agent it is for in its headers.
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { createModels, createProvider } from "@earendil-works/pi-ai/models";
import type { ModelConfig } from "../types.ts";

export const PROVIDER = "models";

/** What an agent's requests say of it (`x-orthograph-about`, `-agent`): the scripted stand-in matches a script by them, and a real endpoint ignores them. */
export interface Who {
  readonly agent: string;
  readonly about: string;
}

export const modelsFor = (config: ModelConfig, kinds: ReadonlyArray<string>, who: Who) => {
  const api = openAICompletionsApi();
  const keyless: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    // pi-ai's adapter wants a header or a key; a keyless endpoint (the stand-in, a local proxy) is sent none.
    if (config.apiKey === undefined) request.headers.delete("Authorization");
    return fetch(request);
  };
  const models = createModels();
  models.setProvider(createProvider({
    id: PROVIDER,
    auth: { apiKey: { name: "the models endpoint's key", resolve: () => Promise.resolve({ auth: config.apiKey === undefined ? {} : { apiKey: config.apiKey } }) } },
    baseUrl: config.baseUrl,
    models: kinds.map((kind) => ({
      id: config.modelFor(kind), name: kind, provider: PROVIDER, api: "openai-completions" as const, baseUrl: config.baseUrl,
      input: ["text" as const], reasoning: false, contextWindow: 128_000, maxTokens: 8192,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    })),
    api: {
      ...api,
      streamSimple: (model, transcript, options) => api.streamSimple(model, transcript, {
        ...options, maxRetries: 0, fetch: keyless,
        headers: { ...options?.headers, ...(config.apiKey === undefined ? { authorization: "local-only" } : {}), "x-orthograph-agent": who.agent, "x-orthograph-about": who.about },
      }),
    },
  }));
  return models;
};
