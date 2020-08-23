import commander from 'commander';
import {projectCreator, runCommander} from '../../util';

commander
  .name('hatch microservice')
  .arguments('[name]')
  .description('Creates a microservice project, according to the hatch architecture')
  .action(projectCreator(__dirname, 'apps'));

runCommander();
