import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch container')
  .arguments('[name]')
  .description('Creates a Redux-connected React component module')
  .action(moduleCreator(__dirname, 'tsx'));

runCommander();
