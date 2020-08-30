import commander from 'commander';
import {clientSDKCreator, projectCreator, runCommander} from '../../util';

commander
  .name('hatch client-sdk')
  .arguments('[name]')
  .option('-d, --dependency <dependency>', 'The hatch microservice or webapp dependency name to generate the OpenAPI spec')
  .option('-v, --ver <ver>', 'The hatch microservice or webapp dependency version to generate the OpenAPI spec')
  .option('-i, --input <input>', 'The location of the OpenAPI spec, as URL or file')
  .description('Creates a client-sdk project from an OpenAPI Specification')
  .action(clientSDKCreator(__dirname, 'libraries'));

runCommander();
