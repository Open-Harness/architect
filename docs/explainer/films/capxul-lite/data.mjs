// What the second film quotes: the design in app/. Nothing in it is compiled or run; app/README.md says what is real syntax and what is proposed.
import { join } from "node:path";
export default ({ home, filesUnder }) => ({ src: filesUnder(join(home, "app")), cap: {}, facts: {} });
