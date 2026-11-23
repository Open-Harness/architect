// @orthograph/web: the browser host and the piece runtime (K29 section 2). A page makes one `WebHost`; every generated piece in
// `generated/web/` is a UI SDK primitive built from `piece`.
export { WebHost } from "#modules/host/service.js";
export { piece } from "#modules/piece/service.js";
export type { ActionFactory, Caller, Outcome, PieceWiring, Refusal, SendCallback, SendDetails } from "#modules/host/types.js";
export type { PieceOptions, PieceState, ReadApi, ReadSpec, WriteApi, WriteSpec } from "#modules/piece/types.js";
