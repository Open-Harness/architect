// @orthograph/compiler: reads blueprint/ by path and builds the model. Never runs in production.
export { IDEMPOTENCY_CONFLICT } from "#modules/model/internal/codes.js";
export { Compiler, canonical, handlerFiles, type HandlerFile } from "#modules/model/service.js";
export { BlueprintInvalid } from "#modules/model/types.js";
export type { Model, ThingModel, OperationModel, FieldModel, FieldsModel, VisibilityModel, AllowedModel, ValueMeta, MoneyAssetModel, AssetModel, EnvironmentModel, PublicationModel, SinkModel, MountModel, FromModel, StoreModel, StoreFromModel, StepModel } from "#modules/model/types.js";
export type { ByModel, ClockModel, MoveTimeModel } from "#modules/time/types.js";
export { nodeSource } from "#modules/source/service.js";
export { packageDir, pluginFolder, resolveFrom } from "#modules/source/service.js";
export { BlueprintSource, SourceError, type PluginPackage, type PluginFiles } from "#modules/source/types.js";
export { Compare } from "#modules/compare/service.js";
export type { Bump, Change, Depends, Release as ModelRelease, Versioned } from "#modules/compare/types.js";
export { RefusalLock } from "#modules/lock/service.js";
export type { Lock, LockEntry, LockValue, Wire } from "#modules/lock/types.js";
