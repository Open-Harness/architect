import { Blueprint } from "orthograph";
import sandbox from "@orthograph/sandbox";

/** What this app uses of the sandbox: a folder and a shell per agent, served over a socket (K40 fix 4). The bridge on this Mac is its stand-in. */
export default Blueprint.use(sandbox, (s) => [
  s.include(s.calls.open),
  s.include(s.calls.close),
  s.include(s.calls.exec),
  s.include(s.calls.write),
  s.include(s.calls.read),
  s.include(s.calls.list),
]);
