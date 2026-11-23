import { Blueprint } from "orthograph";
import { PriceUnavailable } from "./blueprint/things/pricing/errors.js";

export default Blueprint.adapter({
  description: "Prices from a Node-only library whose own types must stay out of every client.",
  choices: {},
  calls: { quote: Blueprint.call({ mode: "promise", errors: [PriceUnavailable] }) },
});
