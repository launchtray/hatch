import commander from 'commander';
import {serverSdkCreator, runCommander} from '../../util';

commander
  .name('hatch server-sdk')
  .option('-n, --name <name>', 'The server SDK package name. Defaults to <dependency>-sdk if '
    + 'generating from a dependency, else required', null)
  .option('-d, --dependency <dependency>', 'The hatch api dependency name to '
    + 'generate the OpenAPI spec', null)
  .option('-v, --ver <ver>', 'The hatch api dependency version to generate the '
    + 'OpenAPI spec. Defaults to \"latest\"', null)
  .option('-s, --spec <spec>', 'The location of the OpenAPI spec, as URL or file', null)
  .description('Creates a server-sdk project from an OpenAPI Specification')
  .action(serverSdkCreator(__dirname, 'libraries'));

runCommander();
