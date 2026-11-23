import type { Slots } from "../types.ts";

/** A copy of the slots, frozen: the pool's size field, the seats kept for a person, and the thing whose rows hold the seats. */
export const sealed = (slots: Slots | undefined): Slots | undefined => (slots === undefined ? undefined : Object.freeze({ ...slots }));
