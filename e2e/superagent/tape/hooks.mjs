// A resolve hook for the tape runner (tape/run.ts): three specifiers a slice 8 journey imports name packages slices 9 and 11 build, so
// the runner points them at throwaway descriptors in tape/shims/. Nothing else is touched, and a shim reaches the real `orthograph`
// through the name `orthograph-real`. Only the tape runner registers this: a real `ortho prove` never sees it.
const MAP = JSON.parse(process.env.TAPE_MAP ?? "{}");

export async function resolve(specifier, context, next) {
  const mapped = MAP[specifier];
  const fromShim = (context.parentURL ?? "").includes("/tape/shims/");
  if (mapped !== undefined && !(specifier === "orthograph" && fromShim)) return { url: mapped, shortCircuit: true };
  return next(specifier, context);
}
