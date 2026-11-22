import { Blueprint } from "orthograph";
import plugin from "@fixture/remote";

// An adapter mounted as `pricing`, with nothing included: this app only needs the mount, to name the service that may call it.
export default Blueprint.use(plugin, () => []);
