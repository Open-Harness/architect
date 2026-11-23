// A read and a write on its thing, on one page: `ProfileGet` for a name, and `LinkAdd`, which adds to the signed-in person's page.
// The read's answer is printed as data, so the check reads it from the bridge's snapshot and from here, never from a layout of ours.
import { LinkAdd } from "@plugged-in/web/link/add.react.tsx";
import { ProfileGet } from "@plugged-in/web/profile/get.react.tsx";
import { mount } from "./boot.tsx";

(window as unknown as { __sentinel: string }).__sentinel = "this page was not reloaded";

mount(
  <>
    <ProfileGet.Root handle={new URLSearchParams(location.search).get("name") ?? ""}>
      {(page: { readonly value: unknown }) => (page.value === null ? <ProfileGet.Refusal /> : <pre data-testid="profile">{JSON.stringify(page.value)}</pre>)}
    </ProfileGet.Root>
    <LinkAdd.Form />
  </>,
);
