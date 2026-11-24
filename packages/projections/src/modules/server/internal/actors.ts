// A thing that lives as actors is read from its Durable Object, so the world's facts door is told which tables are actors' and where they are.
import type { Model } from "@orthograph/compiler";

/** The options `toWorld` takes for actors: none for an app that has none, so its generated server is as it was. */
export const actorOptionOf = (model: Model): string => {
  const tables = Object.values(model.things).filter((t) => t.lives === "actor").map((t) => `"${t.name}"`);
  return tables.length > 0 ? `, actors: env.ACTORS, actorTables: [${tables.join(", ")}]` : "";
};
