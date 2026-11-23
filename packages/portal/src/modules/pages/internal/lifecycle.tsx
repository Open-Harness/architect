// A thing's lifecycle: its states in the machine's order, and, on the thing's own page, the move table with how often each arrow was taken.
import type { ThingWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { moveCount, moveLit } from "./live.ts";
import { Table } from "./parts.tsx";

/** The states of a machine as a strip (home's card and the thing's page); `counted` adds the moves with their live count. */
export const Lifecycle = ({ data, thing, counted }: { readonly data: PortalData; readonly thing: ThingWire; readonly counted: boolean }) => {
  const machine = thing.machine;
  if (machine === null) return null;
  return (
    <div data-portal="lifecycle" data-thing={thing.name} data-states={machine.states.join(",")}>
      {machine.states.map((s) => <span key={s} className="state">{s}</span>)}
      {counted ? (
        <>
          <p>{`States: ${machine.states.join(", ")}. Wrong-state refusal: ${machine.notFrom.error} (exit ${machine.notFrom.exit}). Count is how many times a move was made in the window.`}</p>
          <Table
            head={["Move", "From", "To", "Emits", "Count"]}
            rows={Object.entries(machine.moves).map(([key, m]) => [
              <span data-portal="move" data-move={key} data-lit={moveLit(data, thing.name, key)} data-count={moveCount(data, thing.name, key)}>{key}</span>,
              m.from.join(", ") || "(creates)", m.to.join(", "), m.emits, moveCount(data, thing.name, key),
            ])}
          />
        </>
      ) : null}
    </div>
  );
};
