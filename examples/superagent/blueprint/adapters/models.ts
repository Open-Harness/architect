import { Blueprint } from "orthograph";
import openai from "@orthograph/openai";

/** The model endpoint the agents run on (GOAL17-model-endpoint): VibeProxy for a real run, the scripted stand-in in a world. It adds no call. */
export default Blueprint.use(openai, () => []);
