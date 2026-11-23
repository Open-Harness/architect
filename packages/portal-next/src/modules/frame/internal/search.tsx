// ⌘K: one index in the page (`<script data-portal="search-index">`), searched in UI SDK's `command` inside its `dialog`. The index is the model's
// declarations (things, operations, journeys, refusal codes, environments, monitor) and never a trace; choosing a row goes to its page.
// The shell has its own palette over the map's pages and opens it on the same keys; this one takes the key first (capture phase) and the shell's
// does not open. A shell that could list extra entries would make this unnecessary: that is Snag "the shell's palette takes no entries from data".
import { Command, CommandEmpty, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList } from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { useEffect, useMemo, useState } from "react";
import { Panels } from "../../panels/service.ts";
import type { SearchEntry } from "../../panels/types.ts";
import type { PortalData } from "../../data/types.ts";
import { useEnv } from "./context.ts";

const KINDS: ReadonlyArray<{ readonly kind: SearchEntry["kind"]; readonly label: string }> = [
  { kind: "thing", label: "Things" },
  { kind: "operation", label: "Operations" },
  { kind: "journey", label: "Journeys" },
  { kind: "refusal", label: "Refusal codes" },
  { kind: "environment", label: "Environments" },
  { kind: "monitor", label: "Monitor" },
];

export const Search = ({ data }: { readonly data: PortalData }) => {
  const { links, go } = useEnv();
  const [open, setOpen] = useState(false);
  const index = useMemo(() => Panels.searchIndex(links, data.blueprint), [links, data.blueprint]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setOpen((was) => !was);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, []);
  return (
    <>
      <script type="application/json" data-portal="search-index">{JSON.stringify(index)}</script>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger data-portal="search-trigger" data-shortcut="⌘K">
          <span>Go to any thing, operation or code</span>
          <kbd>⌘K</kbd>
        </DialogTrigger>
        <DialogBackdrop />
        <DialogContent>
          <DialogTitle>Search</DialogTitle>
          <Command aria-label="Search the model" data-portal="search-box">
            <CommandInput aria-label="Search things, operations, journeys, refusal codes and environments" placeholder="Things, operations, journeys, refusal codes, environments" />
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandList>
              {KINDS.map(({ kind, label }) => {
                const rows = index.filter((e) => e.kind === kind);
                return rows.length === 0 ? null : (
                  <CommandGroup key={kind}>
                    <CommandGroupLabel>{label}</CommandGroupLabel>
                    {rows.map((e) => (
                      <CommandItem key={`${e.kind}:${e.name}`} value={`${e.name} ${e.code ?? ""}`.trim()} keywords={[e.kind]} onSelect={() => { setOpen(false); go(e.href); }}>
                        {e.code === undefined ? e.name : `${e.name} ${e.code}`}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
