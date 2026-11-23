// `needsApproval`: an operation says a person must say yes before it runs (#466). `true` is the one value; absence says no.

/** The model's key, only when declared. Anything but `true` is a problem naming the file, and adds no key. */
export const approvalOf = (op: object, file: string, problems: Array<string>): { readonly needsApproval?: true } => {
  if (!("needsApproval" in op)) return {};
  if (op.needsApproval === true) return { needsApproval: true };
  problems.push(`${file}: needsApproval must be \`true\` or left out (a person must say yes before it runs); leave it out for an operation that asks nobody`);
  return {};
};
