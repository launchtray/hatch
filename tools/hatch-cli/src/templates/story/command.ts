import commander from 'commander';
import {moduleCreator, runCommander} from '../../util';

commander
  .name('hatch story')
  .arguments('[name]')
  .description('Creates a Storybook story module')
  .action(moduleCreator(__dirname, 'tsx'));

runCommander();
