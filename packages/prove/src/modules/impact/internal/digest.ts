import { createHash } from "node:crypto";

export const digest = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
