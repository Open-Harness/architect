// What this film quotes: the Capxul Lite design, which both films share. Nothing in it is compiled or run.
import { join } from "node:path";
export default ({ home, filesUnder }) => ({ src: filesUnder(join(home, "../capxul-lite/app")), cap: {}, facts: {} });
