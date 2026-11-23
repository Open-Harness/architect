// Journey-author file. The builders of handle.resolve and profile.get never edit it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { HandleNotFound } from "../blueprint/things/handle/errors.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

const titles = (page: { links: ReadonlyArray<{ title: string }> }) => page.links.map((l) => l.title);

export default Blueprint.journey("anyone reads a public page", {
  // The visitor has no account and no token. Bob is signed in and owns nothing on this page.
  cast: { visitor: Blueprint.anyone, bob: Blueprint.signedIn },
  starts: "page-with-links",
  steps: (s) => [
    s.step(
      "a visitor resolves the name to a handle",
      s.visitor.run(resolve, { name: "linkpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      noEvents(),
      spans({ present: ["handle.resolve", "handle.resolve.load"] }),
    ),
    s.step(
      "a visitor reads the page: the name and every link, in order",
      s.visitor.run(get, { handle: "linkpage" }),
      expect((a) => a.handle).toBe("linkpage"),
      expect(titles).toEqual(["GitHub", "Blog", "Talks"]),
      expect((a) => a.links.map((l: { url: string }) => l.url)).toEqual([
        "https://github.com/aaron",
        "https://aaron.example.com/blog",
        "https://aaron.example.com/talks",
      ]),
      expect((a) => a.links.map((l: { id: string }) => /^lnk_[0-9a-z]+$/.test(l.id))).toEqual([true, true, true]),
      expect((a) => a.links[2].id).toBe(s.world.lastLink),
      expect((a) => Object.keys(a.links[0]).sort()).toEqual(["id", "title", "url"]),
      noEvents(),
      spans({ present: ["profile.get", "profile.get.load"] }),
    ),
    s.step(
      "a signed-in person who is not the owner reads the same page",
      s.bob.run(get, { handle: "linkpage" }),
      expect((a) => a.handle).toBe("linkpage"),
      expect(titles).toEqual(["GitHub", "Blog", "Talks"]),
      noEvents(),
    ),
    s.step(
      "a name nobody claimed has no page",
      s.visitor.run(get, { handle: "nosuchpage" }),
      refuses(ProfileNotFound),
      noEvents(),
      spans({ present: ["profile.get", "profile.get.load"] }),
    ),
    s.step(
      "a name nobody claimed does not resolve",
      s.visitor.run(resolve, { name: "nosuchpage" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
  ],
});
