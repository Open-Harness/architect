import { Blueprint } from "orthograph";
import plugin from "@fixture/ledger";

// A second adapter, mounted as `ledger`: a service that is not `pricing`.
export default Blueprint.use(plugin, () => []);
