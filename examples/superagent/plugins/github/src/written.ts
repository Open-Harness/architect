// Scaffolded from ortho new adapter. Yours from now on.
// What GitHub's description doesn't say. Its events are all in the description (webhooks), so only the stand-in is written:
// a real bare git repository, served over git's smart HTTP, with GitHub's REST API for issues and pull requests beside it.
import { Stand } from "orthograph";

export const events = {};

export const standIn = Stand.process("a bare git repository served by git http-backend, with a small server for GitHub's REST API over it");
