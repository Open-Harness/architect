// What a write tells the reads: "something finished on this thing". A read subscribes for the things it shows.
export interface Bus {
  readonly on: (things: ReadonlyArray<string>, listener: () => void) => () => void;
  readonly emit: (thing: string) => void;
}

export const bus = (): Bus => {
  const listening = new Set<{ readonly things: ReadonlyArray<string>; readonly listener: () => void }>();
  return {
    on: (things, listener) => {
      const entry = { things, listener };
      listening.add(entry);
      return () => void listening.delete(entry);
    },
    emit: (thing) => listening.forEach((entry) => entry.things.includes(thing) && entry.listener()),
  };
};
