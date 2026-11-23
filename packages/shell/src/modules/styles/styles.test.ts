import { describe, expect, it } from "vitest";
import { Styles } from "./service.ts";

const fakeDocument = () => {
  const head: Array<{ id: string; textContent: string }> = [];
  return {
    head: { append: (el: { id: string; textContent: string }) => { head.push(el); } },
    getElementById: (id: string) => head.find((el) => el.id === id) ?? null,
    createElement: () => ({ id: "", textContent: "" }),
    styles: head,
  };
};

describe("Styles", () => {
  it("names no HeroUI token and takes its colours and sizes from UI SDK's tokens and the theme's scale", () => {
    expect(Styles.css).not.toMatch(/heroui/i);
    expect(Styles.css).toContain("var(--ui-border)");
    expect(Styles.css).toContain("var(--theme-space-4");
    expect([...Styles.css.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/g)]).toEqual([]);
  });

  it("installs once", () => {
    const doc = fakeDocument();
    Styles.install(doc as unknown as Document);
    Styles.install(doc as unknown as Document);
    expect(doc.styles).toHaveLength(1);
    expect(doc.styles[0]?.textContent).toBe(Styles.css);
  });
});
