import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch controller')
  .arguments('[name]')
  .description('Creates controller module, according to the hatch architecture')
  .action(moduleCreator(__dirname));

runCommander();
