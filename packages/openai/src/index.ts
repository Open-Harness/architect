// `@orthograph/openai`: the model endpoint an app's agents run on. It makes no call of its own: Pi Durable talks to the endpoint, and an environment says where
// it is (VibeProxy on this Mac for a real run; in a world, the stand-in below, whose address reaches the Worker as `ORTHO_STAND_MODELS`).
import { Blueprint, Stand } from "orthograph";

export default Blueprint.adapter({
  description: "A model endpoint that speaks OpenAI's chat completions: VibeProxy for a real run, a scripted stand-in for a check.",
  calls: {},
  standIn: Stand.process("a model on this machine whose every reply is scripted, speaking OpenAI's chat completions as Pi reads them"),
});
