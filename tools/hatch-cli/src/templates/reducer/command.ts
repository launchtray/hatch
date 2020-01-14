import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch reducer')
  .arguments('[name]')
  .description('Creates a redux reducer module')
  .action(moduleCreator(__dirname));

runCommander();
