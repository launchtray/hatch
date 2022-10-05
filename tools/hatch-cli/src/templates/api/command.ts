import commander from 'commander';
import {projectCreator, runCommander} from '../../util';

commander
  .name('hatch api')
  .arguments('[name]')
  .description('Creates an API project for generating an OpenAPI Specification')
  .action(projectCreator(__dirname, 'libraries'));

runCommander();
