// The palette, on UI SDK's `dialog` and `command`: open on Meta+K or Control+K, a row for each page the caller may open and each operation they
// may call here, each by its name. A row's `onSelect` is the move: a page row navigates, an operation row hands the entry to the app. Both close it.
// The dialog's content is not mounted while it is closed, so the palette is in the page, and for an agent, only while it is open.
import { Command, CommandEmpty, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList } from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { useContext, useEffect, useState } from "react";
import type { ExtraEntry, OperationEntry, PaletteEntry } from "../../palette/types.ts";
import { NavigateContext } from "./link.tsx";

export interface PaletteProps {
  readonly entries: ReadonlyArray<PaletteEntry>;
  /** Rows the app added, already filtered for the caller. */
  readonly extra: ReadonlyArray<ExtraEntry>;
  /** Where a page is from here, or `undefined` when this route lacks a parameter it needs: the row is drawn, and cannot be chosen. */
  readonly hrefOf: (page: string) => string | undefined;
  readonly onOperation: ((entry: OperationEntry) => void) | undefined;
  /** The button in the bar; the keyboard opens the palette whether or not it is there. */
  readonly trigger: boolean;
}

const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const Palette = ({ entries, extra, hrefOf, onOperation, trigger }: PaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useContext(NavigateContext);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((was) => !was);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, []);
  const pages = entries.filter((e) => e.kind === "page");
  const operations = entries.filter((e) => e.kind === "operation");
  const choose = (entry: PaletteEntry): void => {
    setOpen(false);
    if (entry.kind === "operation") onOperation?.(entry);
    else {
      const href = hrefOf(entry.name);
      if (href !== undefined) navigate(href);
    }
  };
  const row = (entry: PaletteEntry) => (
    <CommandItem
      key={`${entry.kind}:${entry.name}`}
      value={entry.name}
      keywords={[entry.description]}
      data-shell="palette-item"
      data-kind={entry.kind}
      data-name={entry.name}
      data-page={entry.kind === "page" ? entry.name : entry.page}
      disabled={entry.kind === "page" && hrefOf(entry.name) === undefined}
      onSelect={() => { choose(entry); }}
    >
      {entry.name}
    </CommandItem>
  );
  const groups = [...new Set(extra.map((e) => e.group))];
  const extraRow = (entry: ExtraEntry) => (
    <CommandItem
      key={`extra:${entry.group}:${entry.name}`}
      value={`${entry.group}:${entry.name}`}
      label={entry.name}
      keywords={entry.description === undefined ? [] : [entry.description]}
      data-shell="palette-item"
      data-kind="extra"
      data-name={entry.name}
      data-group={entry.group}
      onSelect={() => {
        setOpen(false);
        if (entry.href !== undefined) navigate(entry.href);
        entry.run?.();
      }}
    >
      {entry.name}
    </CommandItem>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger data-shell="palette-trigger">
          <span>Command palette</span>
          <kbd>{isMac() ? "⌘K" : "Ctrl K"}</kbd>
        </DialogTrigger>
      ) : null}
      <DialogBackdrop />
      <DialogContent>
        <DialogTitle data-shell="palette-title">Command palette</DialogTitle>
        <Command aria-label="Search" data-shell="palette">
          <CommandInput aria-label="Search pages and operations" placeholder="Go to a page or run an operation" />
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandList>
            {pages.length === 0 ? null : (
              <CommandGroup>
                <CommandGroupLabel>Pages</CommandGroupLabel>
                {pages.map(row)}
              </CommandGroup>
            )}
            {operations.length === 0 ? null : (
              <CommandGroup>
                <CommandGroupLabel>On this page</CommandGroupLabel>
                {operations.map(row)}
              </CommandGroup>
            )}
            {groups.map((group) => (
              <CommandGroup key={group}>
                <CommandGroupLabel>{group}</CommandGroupLabel>
                {extra.filter((e) => e.group === group).map(extraRow)}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
