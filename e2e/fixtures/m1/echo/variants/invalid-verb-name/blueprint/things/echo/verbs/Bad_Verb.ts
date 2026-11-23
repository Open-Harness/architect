import { Blueprint } from "orthograph";
import { Echo } from "../thing.js";

// Planted: a verb's file is lowercase words joined by dashes.
export default Blueprint.operation(Echo, {
  description: "Badly named.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  allowed: [Blueprint.anyone],
});
