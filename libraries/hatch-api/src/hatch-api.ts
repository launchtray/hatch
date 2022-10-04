import process from 'process';
import {
  createApiBySpotFile,
} from './util';

const usage = 'Usage: hatch-api --spot [spot-file].ts';
const argv = process.argv.slice(2);
const typeArg = argv[0];
if (argv.length < 2) {
  throw new Error(`Invalid arguments:\n${usage}`);
} else if (typeArg === '--spot') {
  // location of the OpenAPI spec, as URL or file
  const inputSpec = argv[1];
  createApiBySpotFile(inputSpec).catch((err) => {
    throw new Error(err);
  });
} else {
  throw new Error(`Invalid type argument:\n${usage}`);
}
