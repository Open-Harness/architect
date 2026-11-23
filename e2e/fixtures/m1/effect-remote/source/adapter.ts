import { Blueprint } from "orthograph";
import { PriceUnavailable } from "./blueprint/things/pricing/errors.js";

export default Blueprint.adapter({
  description: "Prices from an Effect service that needs a setting from its own layer.",
  choices: {},
  calls: { quote: Blueprint.call({ mode: "effect", errors: [PriceUnavailable] }) },
});
