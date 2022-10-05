import commander from 'commander';
import {apiCreator, runCommander} from '../../util';

commander
  .name('hatch api')
  .arguments('[name]')
  .option('-s, --specType <specType>', 'The type of input spec to use (json, yaml, Spot)', 'spot')
  .description('Creates an API project for generating an OpenAPI Specification')
  .action(apiCreator(__dirname, 'libraries'));

runCommander();
