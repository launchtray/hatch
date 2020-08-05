import commander from 'commander';
import {projectCreator, runCommander} from '../../util';

commander
  .name('hatch library')
  .arguments('[name]')
  .description('Creates a library project')
  .action(projectCreator(__dirname));

runCommander();
