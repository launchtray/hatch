import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch component')
  .arguments('[name]')
  .description('Creates a React component module')
  .action(moduleCreator(__dirname, 'tsx'));

runCommander();
