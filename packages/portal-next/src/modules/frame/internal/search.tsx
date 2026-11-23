// ⌘K: the top bar's widest control, and the one index in the page (`<script data-portal="search-index">`): the model's declarations (things, operations,
// journeys, refusal codes, environments, monitor) and never a trace. The palette itself is the shell's: it lists these rows through its `extra` source
// (`Panels.extraSource`) and opens on the same keys. With layout `none` the shell draws no button, so this one asks it the way a person does, by the key.
import { useMemo } from "react";
import { Panels } from "../../panels/service.ts";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";

const open = (): void => {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true }));
};

export const Search = ({ data }: { readonly data: PortalData }) => {
  const { links } = useEnv();
  const index = useMemo(() => Panels.searchIndex(links, data.blueprint), [links, data.blueprint]);
  return (
    <>
      <script type="application/json" data-portal="search-index">{JSON.stringify(index)}</script>
      <button type="button" data-portal="search-trigger" data-shortcut="⌘K" onClick={open}>
        <span>Go to any thing, operation or code</span>
        <kbd>⌘K</kbd>
      </button>
    </>
  );
};
