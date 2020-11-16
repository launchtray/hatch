'use strict';

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file.  (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * For details, see the PNPM documentation:
 * https://pnpm.js.org/docs/en/hooks.html
 *
 * IMPORTANT: SINCE THIS FILE CONTAINS EXECUTABLE CODE, MODIFYING IT IS LIKELY TO INVALIDATE
 * ANY CACHED DEPENDENCY ANALYSIS.  After any modification to pnpmfile.js, it's recommended to run
 * "rush update --full" so that PNPM will recalculate all version selections.
 */
module.exports = {
  hooks: {
    readPackage
  }
};

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  // dreamopt 0.6.0 has a corrupted tarball that causes PNPM to fail during installation.
  // dreamopt 0.8.0 has a fixed tarball, and according to semver (and observation) is
  // backwards compatible with 0.6.0.
  // From: https://github.com/andreyvit/dreamopt.js/issues/4
  updateDependencies(context, packageJson.dependencies)
  updateDependencies(context, packageJson.devDependencies)
  updateDependencies(context, packageJson.peerDependencies)

  return packageJson;
}

function updateDependencies(context, dependencies) {
  if (!dependencies) {
    return
  }

  const oldVersion = dependencies['dreamopt']
  if (!oldVersion) {
    return
  }

  // This isn't strictly correct if the package version is `0.6.0` or `~0.6.0` instead of `^0.6.0`, use with care.
  dependencies['dreamopt'] = oldVersion.replace('0.6.0', '0.8.0')
}
