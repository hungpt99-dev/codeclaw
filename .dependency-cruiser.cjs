/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "No circular dependencies allowed.",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-app-to-app-imports",
      severity: "error",
      comment: "apps/cli must not import from other apps.",
      from: { path: "^apps/cli/" },
      to: { path: "^apps/", pathNot: "^apps/cli/" },
    },
    {
      name: "no-app-to-app-imports",
      severity: "error",
      comment: "apps/local-server must not import from other apps.",
      from: { path: "^apps/local-server/" },
      to: { path: "^apps/", pathNot: "^apps/local-server/" },
    },
    {
      name: "no-app-to-app-imports",
      severity: "error",
      comment: "apps/local-web must not import from other apps.",
      from: { path: "^apps/local-web/" },
      to: { path: "^apps/", pathNot: "^apps/local-web/" },
    },
    {
      name: "no-package-to-app-imports",
      severity: "error",
      comment: "Packages must not import from apps.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "shared-no-internal-imports",
      severity: "error",
      comment: "packages/shared must not import other internal packages.",
      from: { path: "^packages/shared/" },
      to: {
        path: "^packages/",
        pathNot: "^packages/shared/",
      },
    },
    {
      name: "no-storage-in-web",
      severity: "error",
      comment: "apps/local-web must not import packages/storage directly.",
      from: { path: "^apps/local-web/" },
      to: { path: "^packages/storage/" },
    },
    {
      name: "no-node-modules-in-web",
      severity: "error",
      comment: "apps/local-web must not import Node-only modules.",
      from: { path: "^apps/local-web/" },
      to: {
        path: "^(fs|path|os|child_process|net|tls|http|https|stream|buffer|crypto|zlib|dns|dgram|cluster|worker_threads|v8|vm)",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "dist",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
