# GOAL17-model-endpoint: real model runs go through VibeProxy; Pi Durable runs the agents

Decided 22 November 2026 by Aaron, in the 📐 superagent thread, recorded by Goal 17's lead.

## The problem

K39 mounted DeepSeek through `@orthograph/openai` with its own key, and the brief asked Aaron for that key before
slice 12's real run. Aaron would rather not make a key for testing.

## The call

- **Aaron's words:** "Use vibe proxy to test as an endpoint", and "Pi durable is the harness".
- **The endpoint.** Every real model run goes through VibeProxy on Aaron's Mac. It serves an OpenAI-compatible API at
  `http://localhost:8317/v1` over subscriptions he already has. The app mounts `@orthograph/openai` as `models`, and
  each environment sets the base URL. That makes it no key and no cloud spend: VibeProxy holds the sign-ins, never
  the repository.
- **The models.**
  - The main agent runs on `deepseek-v4-flash-0731`, the cheapest that judges well.
  - The executor runs on `gpt-6.2-sol`, which Aaron asked to test.
  - Both are set per environment and never written into a handler.
- **The harness.** The superagent's agents run on Pi Durable, as K39 says, behind `@orthograph/agents`. No other
  coding harness runs them.
- **Checks.** Every check still runs on the stand-in model, with no endpoint. A slice may add a real-model run
  through VibeProxy beside its check, and slice 12's real run uses it.

## Evidence

- `GET http://localhost:8317/v1/models`, read by the lead on Aaron's Mac on 22 November 2026, lists both models among others; it cannot be replayed off that machine.

## Open risks

- **VibeProxy only runs on Aaron's Mac.** CI never calls it. A run in a sandbox or on staging needs another endpoint,
  which is its own yes.

## Supersedes

- `design/goals/17-superagent.md`: "plus `@orthograph/agents` and `@orthograph/openai` (for DeepSeek)" → "plus `@orthograph/agents` and `@orthograph/openai` (mounted as `models`, pointed at VibeProxy, GOAL17-model-endpoint)"
- `design/goals/17-superagent.md`: "adapters/{github,slack,posthog,webhook,deepseek,sandbox}.ts" → "adapters/{github,slack,posthog,webhook,models,sandbox}.ts"
- `design/goals/17-superagent.md`: "model: deepseek.model(" → "model: models.model("
- `design/goals/17-superagent.md`: "a Slack app in a workspace he names, and a DeepSeek key, all for slice 12's real run" → "a Slack app in a workspace he names, all for slice 12's real run"
