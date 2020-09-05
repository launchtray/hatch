import {createClientSDKByDependency, createClientSDKByInputSpec} from './util';

const usage = 'Usage: hatch-client-sdk [ --input input-spec | --dependency dependency-name ]';
const argv = process.argv.slice(2);
const typeArg = argv[0];
if (argv.length < 2) {
  console.error('Invalid arguments');
  console.log(usage);
} else if (typeArg === '--input') {
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
  console.error('Invalid type argument.');
  console.log(usage);
}