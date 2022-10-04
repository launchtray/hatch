import commander from 'commander';
import {projectCreator, runCommander} from '../../util';

commander
  .name('hatch api')
  .option('-n, --name <name>', 'The API package name', null)
  .description('Creates an API project for generating an OpenAPI Specification')
  .action(projectCreator(__dirname, 'libraries'));

runCommander();
