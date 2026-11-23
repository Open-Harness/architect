import { Blueprint } from "orthograph";
import { PriceUnavailable } from "./blueprint/things/pricing/errors.js";

export default Blueprint.adapter({
  description: "Prices from a remote HTTP service, called as a plain Promise function.",
  choices: {},
  calls: { quote: Blueprint.call({ mode: "promise", errors: [PriceUnavailable] }) },
});
