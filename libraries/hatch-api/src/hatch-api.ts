import process from 'process';
import {OpenApiV3} from '@airtasker/spot/build/lib/src/generators/openapi3/openapi3-specification';
import {
  createApiBySpotFile,
  createApiByYamlOrJsonFile,
  createApiFromOpenApi3Specs,
} from './util';

const usage = 'Usage: hatch-api [--spot {spot-file}.ts] [--spec {openapi-3-file}.yaml] [--spec {openapi-3-file}.json]';
const argv = process.argv.slice(2);
if (argv.length === 0 || argv.length % 2 !== 0) {
  throw new Error(`Invalid arguments:\n${usage}`);
}

const specs: OpenApiV3[] = [];
for (let argPosition = 0; argPosition < argv.length; argPosition += 2) {
  const typeArg = argv[argPosition];
  const inputSpec = argv[argPosition + 1];
  if (typeArg === '--spot') {
    specs.push(createApiBySpotFile(inputSpec));
  } else if (typeArg === '--spec') {
    specs.push(createApiByYamlOrJsonFile(inputSpec));
  } else {
    throw new Error(`Invalid type argument:\n${usage}`);
  }
}
createApiFromOpenApi3Specs(specs).catch((err) => {
  throw new Error(err);
});
