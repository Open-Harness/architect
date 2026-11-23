// Goal 6, slice 2: the two-client runner. `PORTAL_CLIENT=old|next` (e2e/served-portal, the harness every portal check opens a page through)
// picks the client a check reads when it names none: `old` (unset is `old`) is `packages/portal/dist/client`, `next` is
// `packages/portal-next/dist/client`, and the server half is the same (`@orthograph/portal/server`) either way. A value that is neither
// is refused by name. These are controls of the instrument: they pass today, built clients or not, and keep passing.
import { describe, expect, it } from "vitest";
import { defaultClient } from "../../served-portal/service.ts";
import { ServedPortalUnavailable } from "../../served-portal/types.ts";

describe("the two-client runner", () => {
  it("reads the old client when PORTAL_CLIENT is unset, empty or `old`", () => {
    for (const value of [undefined, "", "old"]) expect(defaultClient(value).endsWith("/packages/portal/dist/client"), `PORTAL_CLIENT=${String(value)}`).toBe(true);
  });
  it("reads the new client when PORTAL_CLIENT=next", () => {
    expect(defaultClient("next").endsWith("/packages/portal-next/dist/client")).toBe(true);
  });
  it("refuses any other value, by name", () => {
    expect(() => defaultClient("newest")).toThrow(ServedPortalUnavailable);
    expect(() => defaultClient("newest")).toThrow(/PORTAL_CLIENT is "newest"/);
  });
  it("reads the environment when it is not told", () => {
    const before = process.env["PORTAL_CLIENT"];
    process.env["PORTAL_CLIENT"] = "next";
    try { expect(defaultClient().endsWith("/packages/portal-next/dist/client")).toBe(true); }
    finally { if (before === undefined) delete process.env["PORTAL_CLIENT"]; else process.env["PORTAL_CLIENT"] = before; }
  });
});
