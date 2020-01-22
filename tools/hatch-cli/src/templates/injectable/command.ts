import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch injectable')
  .arguments('[name]')
  .description('Creates an injectable module, according to the hatch architecture')
  .action(moduleCreator(__dirname));

runCommander();
