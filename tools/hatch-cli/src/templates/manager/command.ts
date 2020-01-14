import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch manager')
  .arguments('[name]')
  .description('Creates manager module, according to the hatch architecture')
  .action(moduleCreator(__dirname));

runCommander();
