// The smallest plugin with an operation that runs on the device (M1.27): one client operation, `receipt.stamp`, with a
// code entry for each host that can run it. Pure metadata, imported by the mount and by the compiler.
import { Blueprint } from "orthograph";

export default Blueprint.feature({
  description: "Stamps a text on the caller's own device, with no server call.",
  needs: [],
});
