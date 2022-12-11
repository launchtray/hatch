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


function overridePackageVersionHelper(
  packageJson,
  context,
  depType,
  packageName,
  desiredVersion,
  existingVersionSelector,
) {
  if (packageJson != null && packageJson[depType] != null) {
    const existingVersion = packageJson[depType][packageName];
    if (existingVersion != null && existingVersion !== desiredVersion) {
      const selector = existingVersionSelector == null ? () => true : existingVersionSelector;
      if (selector(existingVersion)) {
        const parent = packageJson.name;
        context.log('Patching ' + packageName + ' from ' + existingVersion + ' to ' + desiredVersion + ' for ' + parent);
        packageJson[depType][packageName] = desiredVersion;
      }
    }
  }
}

function overrideDependencyVersion(packageJson, context, packageName, desiredVersion, existingVersionSelector) {
  overridePackageVersionHelper(
    packageJson,
    context,
    'dependencies',
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
}

function overridePeerDependencyVersion(packageJson, context, packageName, desiredVersion, existingVersionSelector) {
  overridePackageVersionHelper(
    packageJson,
    context,
    'peerDependencies',
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
}

function overrideDevDependencyVersion(packageJson, context, packageName, desiredVersion, existingVersionSelector) {
  overridePackageVersionHelper(
    packageJson,
    context,
    'devDependencies',
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
}

function overrideAllDependencyVersions(packageJson, context, packageName, desiredVersion, existingVersionSelector) {
  overrideDependencyVersion(
    packageJson,
    context,
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
  overridePeerDependencyVersion(
    packageJson,
    context,
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
  overrideDevDependencyVersion(
    packageJson,
    context,
    packageName,
    desiredVersion,
    existingVersionSelector,
  );
}

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  overrideAllDependencyVersions(packageJson, context, 'fork-ts-checker-webpack-plugin', '6.4.0');
  overrideAllDependencyVersions(packageJson, context, 'postcss', '8.2.12', (existingVersion) => {
    return existingVersion.startsWith('8.2') || existingVersion.startsWith('^8.2') || existingVersion.startsWith('~8.2');
  });
  return packageJson;
}
