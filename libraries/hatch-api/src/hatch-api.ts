import process from 'process';
import {Swagger} from 'atlassian-openapi';
import SwaggerV3 = Swagger.SwaggerV3;
import {
  createApiBySpotFile,
  createApiByYamlOrJsonFile,
  createApiFromOpenApi3Specs,
} from './util';

const usage = 'Usage: hatch-api [--spot {spot-file}.ts] [--spec[-to-dereference] {openapi-3-yaml-or-json-file}]';
const argv = process.argv.slice(2);
if (argv.length === 0 || argv.length % 2 !== 0) {
  throw new Error(`Invalid arguments:\n${usage}`);
}

const specs: Promise<SwaggerV3>[] = [];
let patchFile: string | undefined;
for (let argPosition = 0; argPosition < argv.length; argPosition += 2) {
  const typeArg = argv[argPosition];
  const inputPath = argv[argPosition + 1];
  if (typeArg === '--spot') {
    specs.push(createApiBySpotFile(inputPath));
  } else if (typeArg === '--spec') {
    specs.push(createApiByYamlOrJsonFile(inputPath, false));
  } else if (typeArg === '--spec-to-dereference') {
    specs.push(createApiByYamlOrJsonFile(inputPath, true));
  } else if (typeArg === '--final-patch') {
    patchFile = inputPath;
  } else {
    throw new Error(`Invalid type argument:\n${usage}`);
  }
}
createApiFromOpenApi3Specs(specs, patchFile).catch((err) => {
  throw new Error(err);
});
