// A thing's lifecycle strip: its states in the machine's order. A thing with no machine has no strip. The arrows and their live counts are slice 7's.
import type { ModelWire } from "@orthograph/portal";

export const Lifecycle = ({ thing }: { readonly thing: ModelWire["things"][string] }) => {
  const machine = thing.machine;
  if (machine === null) return null;
  return (
    <div data-portal="lifecycle" data-thing={thing.name} data-states={machine.states.join(",")}>
      {machine.states.map((s) => <span key={s} className="state">{s}</span>)}
    </div>
  );
};
