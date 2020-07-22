import commander from 'commander';
import {componentCreator, runCommander} from '../../util';

commander
  .name('hatch component')
  .arguments('[name]')
  .description('Creates a React component module')
  .action(componentCreator(__dirname));

runCommander();
