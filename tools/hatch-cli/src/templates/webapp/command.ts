import commander from 'commander';
import {projectCreator, runCommander} from '../../util';

commander
  .name('hatch webapp')
  .arguments('[name]')
  .description('Creates a web application project, according to the hatch architecture')
  .action(projectCreator(__dirname, 'apps'));

runCommander();
