// The test Worker: exports the world and the actor so workerd can host them. Nothing else.
export { World } from "../src/modules/world/service.ts";
export { Actor } from "../src/modules/actors/service.ts";
export { Follower } from "../src/modules/follower/service.ts";
export default { fetch: () => new Response("test worker") };
