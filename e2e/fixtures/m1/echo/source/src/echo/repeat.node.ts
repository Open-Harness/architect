// echo.repeat's code on the Node host. A real Node builtin: it must never enter a worker, api or sdk closure.
import { createHash } from "node:crypto";

export default (text: string): string => createHash("sha256").update(text).digest("hex");
