import {createClientSDKByDependency, createClientSDKByInputSpec} from './util';

const usage = 'Usage: hatch-client-sdk [ --spec input-spec | --dependency dependency-name ]';
const argv = process.argv.slice(2);
const typeArg = argv[0];
if (argv.length < 2) {
  throw new Error('Invalid arguments:\n' + usage);
} else if (typeArg === '--spec') {
  // location of the OpenAPI spec, as URL or file
  const inputSpec = argv[1];
  createClientSDKByInputSpec(inputSpec).catch((err) => {
    throw new Error(err);
  });
} else if (typeArg === '--dependency') {
  const dependencyName = argv[1];
  createClientSDKByDependency(dependencyName).catch((err) => {
    throw new Error(err);
  });
} else {
  throw new Error('Invalid type argument:\n' + usage);
}