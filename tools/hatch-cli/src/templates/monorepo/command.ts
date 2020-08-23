import commander from 'commander';
import {monorepoCreator, runCommander} from '../../util';

commander
  .name('hatch monorepo')
  .arguments('[name]')
  .description('Creates a monorepo project')
  .action(monorepoCreator(__dirname));

runCommander();
