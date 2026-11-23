// Better Auth lists React and React DOM as optional peers, for its React client. The Worker never uses that client, but once the portal's client
// (a devDependency of one package) brought React into the lockfile, pnpm wove it into Better Auth's install path, and that path is written into the
// Worker bundle's comments, where check 27 reads it as React in a Worker. K19: the Worker holds no React, not even the name, so these two peers stay unresolved.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "better-auth" || pkg.name.startsWith("@better-auth/")) {
        for (const peers of [pkg.peerDependencies, pkg.peerDependenciesMeta]) {
          if (peers === undefined) continue;
          delete peers.react;
          delete peers["react-dom"];
        }
      }
      return pkg;
    },
  },
};
