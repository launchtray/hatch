import commander from 'commander';
import {clientSDKCreator, projectCreator, runCommander} from '../../util';

commander
  .name('hatch client-sdk')
  .option('-n, --name <name>', 'The client SDK package name. Defaults to <dependency>-sdk if ' +
    'generating from a dependency, else required', null)
  .option('-d, --dependency <dependency>', 'The hatch microservice or webapp dependency name to ' +
    'generate the OpenAPI spec', null)
  .option('-v, --ver <ver>', 'The hatch microservice or webapp dependency version to generate the ' +
    'OpenAPI spec. Defaults to \"latest\"', null)
  .option('-i, --input <input>', 'The location of the OpenAPI spec, as URL or file', null)
  .description('Creates a client-sdk project from an OpenAPI Specification')
  .action(clientSDKCreator(__dirname, 'libraries'));

runCommander();
