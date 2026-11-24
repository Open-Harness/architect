/** What a declaration holds, frozen: plain data a blueprint lists, so a later change to the caller's object cannot reach it. */
export const sealed = <V>(values: V): V => (typeof values === "object" && values !== null ? (Object.freeze(values) as V) : values);
